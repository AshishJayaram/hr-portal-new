import 'package:flutter/material.dart';

class AppTheme {
  // Purple and Orange theme colors to match frontend
  static const Color primaryColor = Color(0xFF8B5CF6); // Purple
  static const Color secondaryColor = Color(0xFFF59E0B); // Orange
  static const Color successColor = Color(0xFF10B981); // Green
  static const Color errorColor = Color(0xFFEF4444); // Red
  static const Color warningColor = Color(0xFFF59E0B); // Orange
  static const Color accentColor = Color(0xFF7C3AED); // Darker purple
  static const Color lightPurple = Color(0xFFA78BFA); // Light purple
  static const Color lightOrange = Color(0xFFFBBF24); // Light orange
  // Frontend parity colors
  static const Color eventPink = Color(0xFFEC4899); // Events (pink)
  static const Color noticePurple = Color(0xFF8B5CF6); // Notices (purple)
  static const Color holidayRed = Color(0xFFEF4444); // Holidays (red)

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.light,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.dark,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
