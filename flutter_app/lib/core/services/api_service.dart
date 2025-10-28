import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:file_picker/file_picker.dart';

class ApiService {
  // Use localhost for web, LAN IP for mobile devices
  // For mobile devices, you might need to use your computer's IP address
  // e.g., 'http://192.168.1.100:8080/api' (replace with your actual IP)
  static const String baseUrl = 'http://localhost:8080/api';
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  
  late final Dio _dio;
  late final FlutterSecureStorage _storage;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));
    
    _storage = const FlutterSecureStorage();
    
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _tokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // Add organization ID header if available
          final userData = await _getCurrentUser();
          if (userData != null && userData['organization_id'] != null) {
            options.headers['X-Organization-ID'] = userData['organization_id'].toString();
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Try to refresh token
            final refreshToken = await _storage.read(key: _refreshTokenKey);
            if (refreshToken != null) {
              try {
                final newTokens = await refreshAuthToken(refreshToken);
                if (newTokens != null) {
                  // Retry the original request with new token
                  final options = error.requestOptions;
                  options.headers['Authorization'] = 'Bearer ${newTokens['token']}';
                  final response = await _dio.fetch(options);
                  handler.resolve(response);
                  return;
                }
              } catch (e) {
                // Refresh failed, logout user silently
                await _storage.delete(key: _tokenKey);
                await _storage.delete(key: _refreshTokenKey);
              }
            } else {
              // No refresh token, logout user silently
              await _storage.delete(key: _tokenKey);
              await _storage.delete(key: _refreshTokenKey);
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  // Authentication methods
  Future<Map<String, dynamic>?> login(String username, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });
      
      if (response.statusCode == 200) {
        final data = response.data;
        await _storage.write(key: _tokenKey, value: data['token']);
        await _storage.write(key: _refreshTokenKey, value: data['refresh_token']);
        return data;
      }
    } catch (e) {
      print('Login error: $e');
      if (e is DioException) {
        if (e.response?.statusCode == 400) {
          throw Exception(e.response?.data['error'] ?? 'Invalid request format');
        } else if (e.response?.statusCode == 401) {
          throw Exception(e.response?.data['error'] ?? 'Invalid credentials');
        } else if (e.response?.statusCode == 500) {
          throw Exception('Server error. Please try again later.');
        } else if (e.type == DioExceptionType.connectionTimeout || 
                   e.type == DioExceptionType.receiveTimeout) {
          throw Exception('Connection timeout. Please check your internet connection.');
        } else if (e.type == DioExceptionType.connectionError) {
          throw Exception('Unable to connect to server. Please check your internet connection.');
        }
      }
      rethrow;
    }
    return null;
  }

  Future<void> logout() async {
    try {
      // Only try to logout if we have a token
      final token = await _storage.read(key: _tokenKey);
      if (token != null) {
        await _dio.post('/auth/logout');
      }
    } catch (e) {
      print('Logout error: $e');
    } finally {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _refreshTokenKey);
    }
  }

  Future<Map<String, dynamic>?> refreshAuthToken(String refreshToken) async {
    try {
      final response = await _dio.post('/auth/refresh', data: {
        'refresh_token': refreshToken,
      });
      
      if (response.statusCode == 200) {
        final data = response.data;
        await _storage.write(key: _tokenKey, value: data['token']);
        await _storage.write(key: _refreshTokenKey, value: data['refresh_token']);
        return data;
      }
    } catch (e) {
      print('Token refresh error: $e');
    }
    return null;
  }

  // Helper method to get current user info
  Future<Map<String, dynamic>?> _getCurrentUser() async {
    try {
      final token = await _storage.read(key: _tokenKey);
      if (token == null) return null;
      
      // Decode JWT token to get user info
      final parts = token.split('.');
      if (parts.length != 3) return null;
      
      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final resp = utf8.decode(base64Url.decode(normalized));
      final payloadMap = json.decode(resp);
      
      return payloadMap;
    } catch (e) {
      print('Get current user error: $e');
      return null;
    }
  }

  // User management methods
  Future<List<Map<String, dynamic>>> getUsers() async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        final response = await _dio.get('/god/users');
        return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
      } else {
        final response = await _dio.get('/users');
        return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
      }
    } catch (e) {
      print('Get users error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getUser(String userId) async {
    try {
      final response = await _dio.get('/users/$userId');
      return response.data['data'];
    } catch (e) {
      print('Get user error: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> createUser(Map<String, dynamic> userData) async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        final response = await _dio.post('/god/users', data: userData);
        return response.data['data'];
      } else {
        final response = await _dio.post('/users', data: userData);
        return response.data['data'];
      }
    } catch (e) {
      print('Create user error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> updateUser(String userId, Map<String, dynamic> userData) async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        final response = await _dio.patch('/god/users/$userId', data: userData);
        return response.data['data'];
      } else {
        final response = await _dio.patch('/users/$userId', data: userData);
        return response.data['data'];
      }
    } catch (e) {
      print('Update user error: $e');
      rethrow;
    }
  }

  Future<bool> deleteUser(String userId) async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        await _dio.delete('/god/users/$userId');
      } else {
        await _dio.delete('/users/$userId');
      }
      return true;
    } catch (e) {
      print('Delete user error: $e');
      return false;
    }
  }

  // Organization methods
  Future<List<Map<String, dynamic>>> getOrganizations() async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        final response = await _dio.get('/god/organizations');
        return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
      } else {
        final response = await _dio.get('/organizations');
        return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
      }
    } catch (e) {
      print('Get organizations error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> createOrganization(Map<String, dynamic> orgData) async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        final response = await _dio.post('/god/organizations', data: orgData);
        return response.data['data'];
      } else {
        final response = await _dio.post('/organizations', data: orgData);
        return response.data['data'];
      }
    } catch (e) {
      print('Create organization error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> updateOrganization(String orgId, Map<String, dynamic> orgData) async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        final response = await _dio.patch('/god/organizations/$orgId', data: orgData);
        return response.data;
      } else {
        final response = await _dio.patch('/organizations/$orgId', data: orgData);
        return response.data;
      }
    } catch (e) {
      print('Update organization error: $e');
      rethrow;
    }
  }

  Future<bool> deleteOrganization(String orgId) async {
    try {
      // Check if user is God role to use platform-wide endpoint
      final authState = await _getCurrentUser();
      if (authState?['role'] == 'God') {
        await _dio.delete('/god/organizations/$orgId');
        return true;
      } else {
        await _dio.delete('/organizations/$orgId');
        return true;
      }
    } catch (e) {
      print('Delete organization error: $e');
      return false;
    }
  }

  // Leave management methods
  Future<List<Map<String, dynamic>>> getLeaves() async {
    try {
      final currentUser = await getCurrentUser();
      if (currentUser == null || currentUser['id'] == null) {
        return [];
      }
      
      final response = await _dio.get('/leaves?userId=${currentUser['id']}');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get leaves error: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getLeaveBalance(String userId) async {
    try {
      final response = await _dio.get('/leaves/balance/$userId');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get leave balance error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> createLeave(Map<String, dynamic> leaveData) async {
    try {
      // Ensure date keys match backend: from_date, to_date
      final payload = Map<String, dynamic>.from(leaveData);
      if (payload.containsKey('from')) {
        payload['from_date'] = payload.remove('from');
      }
      if (payload.containsKey('to')) {
        payload['to_date'] = payload.remove('to');
      }
      final response = await _dio.post('/leaves', data: payload);
      return response.data['data'];
    } catch (e) {
      print('Create leave error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> updateLeave(String leaveId, Map<String, dynamic> leaveData) async {
    try {
      final response = await _dio.patch('/leaves/$leaveId', data: leaveData);
      return response.data['data'];
    } catch (e) {
      print('Update leave error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> approveLeave(String leaveId) async {
    try {
      final response = await _dio.post('/leaves/$leaveId/approve');
      return response.data['data'];
    } catch (e) {
      print('Approve leave error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> rejectLeave(String leaveId, {String? reason}) async {
    try {
      final response = await _dio.post('/leaves/$leaveId/reject', data: {
        if (reason != null) 'reason': reason,
      });
      return response.data['data'];
    } catch (e) {
      print('Reject leave error: $e');
      rethrow;
    }
  }

  // Document methods
  Future<List<Map<String, dynamic>>> getDocuments({String? userId}) async {
    try {
      String url = '/documents';
      if (userId != null) {
        url += '?userId=$userId';
      }
      final response = await _dio.get(url);
      return List<Map<String, dynamic>>.from(response.data['documents'] ?? response.data['data'] ?? []);
    } catch (e) {
      print('Get documents error: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getUserDocuments(String userId) async {
    try {
      final response = await _dio.get('/users/$userId/documents');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get user documents error: $e');
      return [];
    }
  }

  Future<bool> deleteDocument(String documentId) async {
    try {
      await _dio.delete('/documents/$documentId');
      return true;
    } catch (e) {
      print('Delete document error: $e');
      return false;
    }
  }

  Future<String?> downloadDocument(String documentId) async {
    try {
      final response = await _dio.get('/documents/$documentId/download');
      return response.data['fileUrl'];
    } catch (e) {
      print('Download document error: $e');
      return null;
    };
  }

  // Salary slip methods
  Future<List<Map<String, dynamic>>> getSalarySlips() async {
    try {
      final response = await _dio.get('/salary-slips');
      return List<Map<String, dynamic>>.from(response.data['salary_slips'] ?? response.data['data'] ?? []);
    } catch (e) {
      print('Get salary slips error: $e');
      return [];
    }
  }

  Future<bool> deleteSalarySlip(String slipId) async {
    try {
      await _dio.delete('/salary-slips/$slipId');
      return true;
    } catch (e) {
      print('Delete salary slip error: $e');
      return false;
    }
  }

  Future<bool> generatePayslipPDF(Map<String, dynamic> payslipData) async {
    try {
      final response = await _dio.post(
        '/salary-slips/generate',
        data: payslipData,
        options: Options(
          responseType: ResponseType.bytes,
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      // The response contains the PDF as bytes
      if (response.statusCode == 200 && response.data != null) {
        // For mobile, we would save the PDF to a file
        // For now, just return success
        return true;
      }

      return false;
    } catch (e) {
      print('Generate payslip PDF error: $e');
      return false;
    }
  }

  // Holiday methods
  Future<List<Map<String, dynamic>>> getHolidays() async {
    try {
      final response = await _dio.get('/holidays');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get holidays error: $e');
      return [];
    }
  }

  Future<bool> createHoliday(Map<String, dynamic> holidayData) async {
    try {
      final response = await _dio.post('/holidays', data: holidayData);
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('Create holiday error: $e');
      if (e is DioException) {
        print('Dio error details: ${e.response?.data}');
        print('Status code: ${e.response?.statusCode}');
      }
      return false;
    }
  }

  // Platform statistics (for God dashboard)
  Future<Map<String, dynamic>?> getPlatformStats() async {
    try {
      final response = await _dio.get('/god/stats');
      return response.data['data']; // God stats endpoint returns data in 'data' field
    } catch (e) {
      print('Get platform stats error: $e');
      return null;
    }
  }

  // Dashboard statistics (for regular users)
  Future<Map<String, dynamic>?> getDashboardStats() async {
    try {
      final response = await _dio.get('/dashboard/stats');
      return response.data; // Backend returns data directly, not wrapped in 'data' field
    } catch (e) {
      print('Get dashboard stats error: $e');
      return null;
    }
  }

  // Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: _tokenKey);
    return token != null;
  }

  // Test server connectivity
  Future<bool> testConnection() async {
    try {
      // Use the health endpoint without /api prefix since it's at root level
      final response = await Dio(BaseOptions(
        baseUrl: baseUrl.replaceAll('/api', ''),
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      )).get('/health');
      return response.statusCode == 200;
    } catch (e) {
      print('Connection test failed: $e');
      return false;
    }
  }

  // Get current user info
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      return response.data['data'];
    } catch (e) {
      print('Get current user error: $e');
      return null;
    }
  }

  // Leave categories methods
  Future<List<Map<String, dynamic>>> getLeaveCategories() async {
    try {
      final response = await _dio.get('/leave-categories');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get leave categories error: $e');
      return [];
    }
  }

  // Leave allocations methods
  Future<List<Map<String, dynamic>>> getLeaveAllocations(String userId) async {
    try {
      final response = await _dio.get('/leave-allocations/$userId');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get leave allocations error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> createLeaveAllocation(Map<String, dynamic> allocationData) async {
    try {
      final response = await _dio.post('/leave-allocations', data: allocationData);
      return response.data['data'];
    } catch (e) {
      print('Create leave allocation error: $e');
      rethrow;
    }
  }

  // Off-site management methods
  Future<List<Map<String, dynamic>>> getOffSites() async {
    try {
      final response = await _dio.get('/off-sites');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get off-sites error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> createOffSite(Map<String, dynamic> offSiteData) async {
    try {
      final response = await _dio.post('/off-sites', data: offSiteData);
      return response.data['data'];
    } catch (e) {
      print('Create off-site error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> updateOffSite(String offSiteId, Map<String, dynamic> offSiteData) async {
    try {
      final response = await _dio.patch('/off-sites/$offSiteId', data: offSiteData);
      return response.data['data'];
    } catch (e) {
      print('Update off-site error: $e');
      rethrow;
    }
  }

  Future<bool> deleteOffSite(String offSiteId) async {
    try {
      await _dio.delete('/off-sites/$offSiteId');
      return true;
    } catch (e) {
      print('Delete off-site error: $e');
      return false;
    }
  }

  // Document upload methods
  Future<Map<String, dynamic>?> uploadDocument(FormData formData) async {
    try {
      final response = await _dio.post('/documents', data: formData);
      return response.data['data'];
    } catch (e) {
      print('Upload document error: $e');
      rethrow;
    }
  }

  // -------------------- Reimbursements --------------------
  Future<List<Map<String, dynamic>>> getReimbursements({String? status, String? view}) async {
    try {
      String url = '/reimbursements';
      final params = <String, String>{};
      if (status != null && status.isNotEmpty) params['status'] = status;
      if (view != null && view.isNotEmpty) params['view'] = view;
      if (params.isNotEmpty) {
        url += '?'
            + params.entries.map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}').join('&');
      }
      final response = await _dio.get(url);
      final data = response.data;
      final list = data['data'] ?? data['reimbursements'] ?? data;
      return List<Map<String, dynamic>>.from(list ?? []);
    } catch (e) {
      print('Get reimbursements error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> createReimbursement({
    required String reason,
    String? description,
    required double amount,
    required String date, // YYYY-MM-DD
    required List<PlatformFile> bills,
    String? applyForUserId,
  }) async {
    try {
      final formData = FormData();
      formData.fields
        ..add(MapEntry('reason', reason))
        ..add(MapEntry('amount', amount.toString()))
        ..add(MapEntry('date', date));
      if (description != null && description.isNotEmpty) {
        formData.fields.add(MapEntry('description', description));
      }
      if (applyForUserId != null && applyForUserId.isNotEmpty) {
        formData.fields.add(MapEntry('applyForUserId', applyForUserId));
      }

      for (final file in bills) {
        if (file.bytes != null) {
          formData.files.add(MapEntry(
            'bills',
            MultipartFile.fromBytes(
              file.bytes as Uint8List,
              filename: file.name,
            ),
          ));
        } else if (file.path != null) {
          formData.files.add(MapEntry(
            'bills',
            await MultipartFile.fromFile(file.path!, filename: file.name),
          ));
        }
      }

      final response = await _dio.post('/reimbursements', data: formData);
      return response.data['data'];
    } catch (e) {
      print('Create reimbursement error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> updateReimbursement(String id, {
    String? reason,
    String? description,
    double? amount,
    String? date,
    List<PlatformFile>? newBills,
  }) async {
    try {
      final formData = FormData();
      if (reason != null) formData.fields.add(MapEntry('reason', reason));
      if (description != null) formData.fields.add(MapEntry('description', description));
      if (amount != null) formData.fields.add(MapEntry('amount', amount.toString()));
      if (date != null) formData.fields.add(MapEntry('date', date));
      if (newBills != null) {
        for (final file in newBills) {
          if (file.bytes != null) {
            formData.files.add(MapEntry(
              'bills',
              MultipartFile.fromBytes(
                file.bytes as Uint8List,
                filename: file.name,
              ),
            ));
          } else if (file.path != null) {
            formData.files.add(MapEntry(
              'bills',
              await MultipartFile.fromFile(file.path!, filename: file.name),
            ));
          }
        }
      }

      final response = await _dio.patch('/reimbursements/$id', data: formData);
      return response.data['data'];
    } catch (e) {
      print('Update reimbursement error: $e');
      rethrow;
    }
  }

  Future<bool> deleteReimbursement(String id) async {
    try {
      await _dio.delete('/reimbursements/$id');
      return true;
    } catch (e) {
      print('Delete reimbursement error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> updateReimbursementStatus(String id, {
    required String status, // approved | rejected | returned
    String? message,
  }) async {
    try {
      String endpoint;
      switch (status) {
        case 'approved':
          endpoint = '/reimbursements/$id/approve';
          break;
        case 'rejected':
          endpoint = '/reimbursements/$id/reject';
          break;
        case 'returned':
          endpoint = '/reimbursements/$id/return';
          break;
        default:
          throw Exception('Invalid status: $status');
      }
      final data = (status == 'rejected' || status == 'returned') && message != null
          ? {'reason': message}
          : null;
      final response = await _dio.post(endpoint, data: data);
      return response.data['data'];
    } catch (e) {
      print('Update reimbursement status error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> uploadUserDocument(String userId, FormData formData) async {
    try {
      formData.fields.add(MapEntry('userId', userId));
      formData.fields.add(MapEntry('isPublic', 'false')); // Default to private
      final response = await _dio.post('/documents', data: formData);
      return response.data['data'];
    } catch (e) {
      print('Upload user document error: $e');
      rethrow;
    }
  }

  // Salary slip add methods
  Future<Map<String, dynamic>?> addSalarySlip(FormData formData) async {
    try {
      final response = await _dio.post('/salary-slips', data: formData);
      return response.data['data'];
    } catch (e) {
      print('Add salary slip error: $e');
      rethrow;
    }
  }

  // Holiday management methods

  Future<Map<String, dynamic>?> updateHoliday(String holidayId, Map<String, dynamic> holidayData) async {
    try {
      final response = await _dio.patch('/holidays/$holidayId', data: holidayData);
      return response.data['data'];
    } catch (e) {
      print('Update holiday error: $e');
      rethrow;
    }
  }

  Future<bool> deleteHoliday(String holidayId) async {
    try {
      await _dio.delete('/holidays/$holidayId');
      return true;
    } catch (e) {
      print('Delete holiday error: $e');
      return false;
    }
  }

  // Leave management methods
  Future<bool> deleteLeave(String leaveId) async {
    try {
      await _dio.delete('/leaves/$leaveId');
      return true;
    } catch (e) {
      print('Delete leave error: $e');
      return false;
    }
  }

  Future<bool> cancelLeave(String leaveId) async {
    try {
      await _dio.patch('/leaves/$leaveId/cancel');
      return true;
    } catch (e) {
      print('Cancel leave error: $e');
      return false;
    }
  }

  Future<List<int>> getAvailableHolidayYears() async {
    try {
      final response = await _dio.get('/holidays/years');
      return List<int>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get available holiday years error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> getHolidaysWithFilters({int? year}) async {
    try {
      String url = '/holidays';
      if (year != null) {
        url += '?year=$year';
      }
      final response = await _dio.get(url);
      return response.data;
    } catch (e) {
      print('Get holidays error: $e');
      return {};
    }
  }

  // Team management methods
  Future<List<Map<String, dynamic>>> getTeam() async {
    try {
      final response = await _dio.get('/team');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get team error: $e');
      return [];
    }
  }

  // Audit logs methods
  Future<Map<String, dynamic>> getAuditLogs({
    int page = 1,
    int limit = 10,
    String? entityType,
    String? action,
    String? changedBy,
  }) async {
    try {
      String url = '/audit/logs?page=$page&limit=$limit';
      if (entityType != null) url += '&entity_type=$entityType';
      if (action != null) url += '&action=$action';
      if (changedBy != null) url += '&changed_by=$changedBy';
      
      final response = await _dio.get(url);
      return response.data;
    } catch (e) {
      print('Get audit logs error: $e');
      return {'data': [], 'pagination': {}};
    }
  }

  Future<List<Map<String, dynamic>>> getUserAuditLogs(String userId) async {
    try {
      final response = await _dio.get('/audit/logs/user/$userId');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get user audit logs error: $e');
      return [];
    }
  }

  // User management methods (if not already present)
  Future<List<Map<String, dynamic>>> getAllUsers() async {
    try {
      final response = await _dio.get('/users');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } catch (e) {
      print('Get all users error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getUserById(String userId) async {
    try {
      final response = await _dio.get('/users/$userId');
      return response.data['data'];
    } catch (e) {
      print('Get user by ID error: $e');
      return null;
    }
  }

  // Helper method to check if user can manage documents
  Future<bool> canManageDocuments() async {
    try {
      final currentUser = await _getCurrentUser();
      if (currentUser == null) return false;
      
      final role = currentUser['role']?.toString().toLowerCase();
      return ['hr', 'admin', 'god'].contains(role);
    } catch (e) {
      print('Check manage documents permission error: $e');
      return false;
    }
  }


  Future<bool> changePassword(Map<String, dynamic> passwordData) async {
    try {
      final response = await _dio.post('/auth/change-password', data: passwordData);
      return response.statusCode == 200;
    } catch (e) {
      print('Change password error: $e');
      rethrow;
    }
  }
}
