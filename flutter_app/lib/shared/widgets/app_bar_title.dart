import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/providers/providers.dart';
import '../../core/services/api_service.dart';

class AppBarTitle extends ConsumerWidget {
  final String fallbackTitle;
  final bool showLogo;

  const AppBarTitle({
    super.key,
    required this.fallbackTitle,
    this.showLogo = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    
    // Only fetch organization data for non-God users
    if (user == null || user.role == 'God' || !showLogo) {
      return Text(
        fallbackTitle,
        style: LiquidGlassTheme.heading4.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
        overflow: TextOverflow.ellipsis,
      );
    }

    final apiService = ref.read(apiServiceProvider);
    final baseUrl = 'http://localhost:8080';

    return FutureBuilder<Map<String, dynamic>?>(
      future: apiService.getCurrentUser(),
      builder: (context, snapshot) {
        final userData = snapshot.data;
        final organization = userData?['organization'] as Map<String, dynamic>?;
        final organizationLogo = organization?['logo_url'] ?? organization?['logo'];
        final organizationName = organization?['name'];
        final hasLogo = organizationLogo != null && 
                       organizationLogo.toString().trim().isNotEmpty &&
                       showLogo;

        if (hasLogo) {
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(
                  maxHeight: 32,
                  maxWidth: 200,
                ),
                child: Image.network(
                  organizationLogo.toString().startsWith('http')
                      ? organizationLogo.toString()
                      : '$baseUrl${organizationLogo.toString().startsWith('/') ? organizationLogo : '/$organizationLogo'}',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return _buildTextTitle(organizationName ?? fallbackTitle);
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return const SizedBox(
                      width: 32,
                      height: 32,
                      child: Center(
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: _buildTextTitle(organizationName ?? fallbackTitle),
              ),
            ],
          );
        } else {
          return _buildTextTitle(organizationName ?? fallbackTitle);
        }
      },
    );
  }

  Widget _buildTextTitle(String title) {
    return Text(
      title,
      style: LiquidGlassTheme.heading4.copyWith(
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
      overflow: TextOverflow.ellipsis,
      maxLines: 1,
    );
  }
}

