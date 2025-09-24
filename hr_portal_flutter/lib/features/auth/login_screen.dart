import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Card(
          margin: const EdgeInsets.all(24),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'HR Portal',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(height: 32),
                      TextFormField(
                        controller: _usernameController,
                        decoration: const InputDecoration(
                          labelText: 'Username',
                          prefixIcon: Icon(Icons.person),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter username';
                          }
                          if (value.trim().length < 3) {
                            return 'Username must be at least 3 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock),
                        ),
                        obscureText: true,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter password';
                          }
                          if (value.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : () async {
                        if (_formKey.currentState!.validate()) {
                          setState(() {
                            _isLoading = true;
                          });
                          
                          try {
                            // Test connection first
                            final apiService = ref.read(apiServiceProvider);
                            final isConnected = await apiService.testConnection();
                            if (!isConnected) {
                              throw Exception('Unable to connect to server. Please check your internet connection and ensure the backend server is running.');
                            }
                            await ref.read(authProvider.notifier).login(
                              _usernameController.text,
                              _passwordController.text,
                            );
                            
                            // Redirect God users to God Dashboard, others to regular dashboard
                            final user = ref.read(authProvider).user;
                            if (user?.role == 'God') {
                              context.go('/god-dashboard');
                            } else {
                              context.go('/dashboard');
                            }
                          } catch (e) {
                            String errorMessage = 'Login failed';
                            if (e.toString().contains('Invalid credentials')) {
                              errorMessage = 'Invalid username, password, or organization ID';
                            } else if (e.toString().contains('Connection timeout')) {
                              errorMessage = 'Connection timeout. Please check your internet connection.';
                            } else if (e.toString().contains('Unable to connect')) {
                              errorMessage = 'Unable to connect to server. Please check your internet connection.';
                            } else if (e.toString().contains('Server error')) {
                              errorMessage = 'Server error. Please try again later.';
                            } else if (e.toString().contains('user account is deactivated')) {
                              errorMessage = 'Your account has been deactivated. Please contact your administrator.';
                            } else {
                              errorMessage = 'Login failed: ${e.toString().replaceAll('Exception: ', '')}';
                            }
                            
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(errorMessage),
                                backgroundColor: Colors.red,
                                duration: const Duration(seconds: 5),
                              ),
                            );
                          } finally {
                            setState(() {
                              _isLoading = false;
                            });
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading 
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text('Login'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Demo Credentials:\nUsername: admin\nPassword: admin123\n\nOr create a new user account',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
