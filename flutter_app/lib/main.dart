import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'core/providers/providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(
    ProviderScope(
      child: LiquidHRPortalApp(),
    ),
  );
}

class LiquidHRPortalApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    
    return MaterialApp.router(
      title: 'Liquid HR Portal',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: appRouter,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return Animate(
          effects: [
            FadeEffect(
              duration: 300.ms,
              curve: Curves.easeOut,
            ),
            SlideEffect(
              begin: const Offset(0, 0.1),
              duration: 300.ms,
              curve: Curves.easeOut,
            ),
          ],
          child: child ?? const SizedBox(),
        );
      },
    );
  }
}
