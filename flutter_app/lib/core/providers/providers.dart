import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

// SharedPreferences Provider
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async {
  return await SharedPreferences.getInstance();
});

// Theme Mode Provider
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.system);
  
  void setThemeMode(ThemeMode mode) {
    state = mode;
  }
  
  void toggleTheme() {
    state = state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
  }
}

// User Model
class User {
  final String id;
  final String name;
  final String email;
  final String designation;
  final String department;
  final String role;
  final double? ctc;
  final String username;
  final String organizationId;
  final bool isActive;
  final DateTime? lastLoginAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.designation,
    required this.department,
    required this.role,
    required this.username,
    required this.organizationId,
    required this.isActive,
    this.ctc,
    this.lastLoginAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    double? parseCtc(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    return User(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      designation: json['designation'] ?? '',
      department: json['department'] ?? '',
      role: json['role'] ?? '',
      username: json['username'] ?? '',
      organizationId: json['organization_id']?.toString() ?? '',
      isActive: json['is_active'] ?? true,
      // Accept ctc as number or numeric string; ignore encrypted strings
      ctc: parseCtc(json['ctc'] ?? json['CTC'] ?? json['ctc_value'] ?? json['ctc_numeric']),
      lastLoginAt: json['last_login_at'] != null 
          ? DateTime.tryParse(json['last_login_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'designation': designation,
      'department': department,
      'role': role,
      'username': username,
      'organization_id': organizationId,
      'is_active': isActive,
      'ctc': ctc,
      'last_login_at': lastLoginAt?.toIso8601String(),
    };
  }
}

// Auth Provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(apiServiceProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService;

  AuthNotifier(this._apiService) : super(AuthState.unauthenticated) {
    _checkAuthStatus();
  }
  
  Future<void> _checkAuthStatus() async {
    final isAuthenticated = await _apiService.isAuthenticated();
    if (isAuthenticated) {
      final userData = await _apiService.getCurrentUser();
      if (userData != null) {
        state = AuthState(
          status: AuthStatus.authenticated,
          user: User.fromJson(userData),
        );
      }
    }
  }
  
  Future<void> login(String username, String password) async {
    state = AuthState(status: AuthStatus.loading);
    
    try {
      final response = await _apiService.login(username, password);
      print('Login response: $response'); // Debug log
      
      if (response != null) {
        // Check for both 'user' and 'User' keys (case sensitivity)
        final userData = response['user'] ?? response['User'];
        if (userData != null) {
          state = AuthState(
            status: AuthStatus.authenticated,
            user: User.fromJson(userData),
          );
        } else {
          state = AuthState.unauthenticated;
          throw Exception('Login failed: No user data in response');
        }
      } else {
        state = AuthState.unauthenticated;
        throw Exception('Login failed: No response from server');
      }
    } catch (e) {
      state = AuthState.unauthenticated;
      rethrow;
    }
  }
  
  Future<void> logout() async {
    await _apiService.logout();
    state = AuthState.unauthenticated;
  }

  Future<void> updateUser(User user) async {
    if (state.status == AuthStatus.authenticated) {
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
      );
    }
  }
}

enum AuthStatus {
  unauthenticated,
  authenticated,
  loading,
}

class AuthState {
  final AuthStatus status;
  final User? user;

  AuthState({
    required this.status,
    this.user,
  });

  static AuthState get unauthenticated => AuthState(status: AuthStatus.unauthenticated);
}

// API Service Provider
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});