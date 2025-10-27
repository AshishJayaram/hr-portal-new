import 'package:flutter/material.dart';
import 'liquid_glass_theme.dart';

class AppTheme {
  // Legacy colors for backward compatibility
  static const Color primaryColor = LiquidGlassTheme.primaryPurple;
  static const Color secondaryColor = LiquidGlassTheme.secondaryOrange;
  static const Color successColor = LiquidGlassTheme.accentGreen;
  static const Color errorColor = LiquidGlassTheme.accentRed;
  static const Color warningColor = LiquidGlassTheme.secondaryOrange;
  static const Color accentColor = LiquidGlassTheme.primaryPurpleDark;
  static const Color lightPurple = LiquidGlassTheme.primaryPurpleLight;
  static const Color lightOrange = LiquidGlassTheme.secondaryOrangeLight;
  static const Color eventPink = LiquidGlassTheme.accentPink;
  static const Color noticePurple = LiquidGlassTheme.primaryPurple;
  static const Color holidayRed = LiquidGlassTheme.accentRed;

  static ThemeData get lightTheme => LiquidGlassTheme.lightTheme;
  static ThemeData get darkTheme => LiquidGlassTheme.darkTheme;
}
