import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';

import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';

class LoginScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  late AnimationController _logoController;
  late AnimationController _formController;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _formController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _logoController.forward();
    Future.delayed(const Duration(milliseconds: 500), () {
      _formController.forward();
    });
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _logoController.dispose();
    _formController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark 
              ? LiquidGlassTheme.darkPrimaryGradient 
              : LiquidGlassTheme.primaryGradient,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(LiquidGlassTheme.spacingL),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Section
                  _buildLogoSection(context, isDark)
                      .animate()
                      .fadeIn(duration: 800.ms, delay: 200.ms)
                      .slideY(begin: -0.3, end: 0)
                      .scale(begin: const Offset(0.8, 0.8), end: const Offset(1, 1)),
                  
                  const SizedBox(height: LiquidGlassTheme.spacingXXL),
                  
                  // Login Form
                  _buildLoginForm(context, isLoading, isDark)
                      .animate()
                      .fadeIn(duration: 800.ms, delay: 600.ms)
                      .slideY(begin: 0.3, end: 0)
                      .scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1)),
                  
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoSection(BuildContext context, bool isDark) {
    return Column(
      children: [
        // App Icon
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LiquidGlassTheme.accentGradient,
          ),
          child: const Icon(
            Icons.business_rounded,
            size: 60,
            color: Colors.white,
          ),
        ),
        
        const SizedBox(height: LiquidGlassTheme.spacingL),
        
        // App Title
        Text(
          'HR Portal',
          style: LiquidGlassTheme.heading1.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            letterSpacing: -1,
          ),
        ),
        
        const SizedBox(height: LiquidGlassTheme.spacingS),
        
        // Subtitle
        Text(
          'Your Gateway to HR Excellence',
          style: LiquidGlassTheme.bodyLarge.copyWith(
            color: Colors.white70,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginForm(BuildContext context, bool isLoading, bool isDark) {
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.15),
      borderRadius: LiquidGlassTheme.radiusXLarge,
      padding: const EdgeInsets.all(LiquidGlassTheme.spacingXL),
      boxShadow: [], // Remove shadows for cleaner liquid glass effect
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome Text
            Text(
              'Welcome Back',
              style: LiquidGlassTheme.heading3.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: LiquidGlassTheme.spacingS),
            
            Text(
              'Sign in to continue',
              style: LiquidGlassTheme.bodyMedium.copyWith(
                color: Colors.white70,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: LiquidGlassTheme.spacingXL),
            
            // Username Field
            GlassTextField(
              controller: _usernameController,
              labelText: 'Username',
              hintText: 'Enter your username',
              prefixIcon: Container(
                padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
                child: const Icon(
                  Icons.person_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
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
            
            const SizedBox(height: LiquidGlassTheme.spacingL),
            
            // Password Field
            GlassTextField(
              controller: _passwordController,
              labelText: 'Password',
              hintText: 'Enter your password',
              obscureText: _obscurePassword,
              prefixIcon: Container(
                padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
                child: const Icon(
                  Icons.lock_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                  color: Colors.white70,
                ),
                onPressed: () {
                  setState(() {
                    _obscurePassword = !_obscurePassword;
                  });
                },
              ),
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
            
            const SizedBox(height: LiquidGlassTheme.spacingXL),
            
            // Login Button
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                gradient: LinearGradient(
                  colors: [
                    Colors.white.withOpacity(0.15),
                    Colors.white.withOpacity(0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(
                  color: Colors.white.withOpacity(0.4),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: isLoading ? null : _handleLogin,
                  borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: LiquidGlassTheme.spacingL,
                    ),
                    child: Center(
                      child: isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              'Sign In',
                              style: LiquidGlassTheme.bodyLarge.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 18,
                                shadows: [
                                  Shadow(
                                    color: Colors.black.withOpacity(0.3),
                                    blurRadius: 2,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                            ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }


  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
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
          errorMessage = 'Invalid username or password';
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
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: LiquidGlassTheme.accentRed,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
              ),
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }

}