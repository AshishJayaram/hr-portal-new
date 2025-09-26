import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

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
        return List<Map<String, dynamic>>.from(response.data['users'] ?? []);
      } else {
        final response = await _dio.get('/users');
        return List<Map<String, dynamic>>.from(response.data['users'] ?? []);
      }
    } catch (e) {
      print('Get users error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getUser(String userId) async {
    try {
      final response = await _dio.get('/users/$userId');
      return response.data;
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
        return response.data;
      } else {
        final response = await _dio.post('/users', data: userData);
        return response.data;
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
        return response.data;
      } else {
        final response = await _dio.put('/users/$userId', data: userData);
        return response.data;
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
        return response.data;
      } else {
        final response = await _dio.post('/organizations', data: orgData);
        return response.data;
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
      final response = await _dio.get('/leaves');
      return List<Map<String, dynamic>>.from(response.data['leaves'] ?? []);
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
      final response = await _dio.post('/leaves', data: leaveData);
      return response.data;
    } catch (e) {
      print('Create leave error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> updateLeave(String leaveId, Map<String, dynamic> leaveData) async {
    try {
      final response = await _dio.put('/leaves/$leaveId', data: leaveData);
      return response.data;
    } catch (e) {
      print('Update leave error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> approveLeave(String leaveId) async {
    try {
      final response = await _dio.post('/leaves/$leaveId/approve');
      return response.data;
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
      return response.data;
    } catch (e) {
      print('Reject leave error: $e');
      rethrow;
    }
  }

  // Document methods
  Future<List<Map<String, dynamic>>> getDocuments() async {
    try {
      final response = await _dio.get('/documents');
      return List<Map<String, dynamic>>.from(response.data['documents'] ?? []);
    } catch (e) {
      print('Get documents error: $e');
      return [];
    }
  }

  // Salary slip methods
  Future<List<Map<String, dynamic>>> getSalarySlips() async {
    try {
      final response = await _dio.get('/salary-slips');
      return List<Map<String, dynamic>>.from(response.data['salary_slips'] ?? []);
    } catch (e) {
      print('Get salary slips error: $e');
      return [];
    }
  }

  // Holiday methods
  Future<List<Map<String, dynamic>>> getHolidays() async {
    try {
      final response = await _dio.get('/holidays');
      return List<Map<String, dynamic>>.from(response.data['holidays'] ?? []);
    } catch (e) {
      print('Get holidays error: $e');
      return [];
    }
  }

  // Platform statistics (for God dashboard)
  Future<Map<String, dynamic>?> getPlatformStats() async {
    try {
      final response = await _dio.get('/god/stats');
      return response.data['data']; // Backend returns data in 'data' field
    } catch (e) {
      print('Get platform stats error: $e');
      return null;
    }
  }

  // Dashboard statistics (for regular users)
  Future<Map<String, dynamic>?> getDashboardStats() async {
    try {
      final response = await _dio.get('/dashboard/stats');
      return response.data['data']; // Backend returns data in 'data' field
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
      return response.data;
    } catch (e) {
      print('Get current user error: $e');
      return null;
    }
  }
}
