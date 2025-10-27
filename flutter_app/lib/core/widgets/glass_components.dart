import 'package:flutter/material.dart';
import 'dart:ui';
import '../theme/liquid_glass_theme.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;
  final Color? backgroundColor;
  final Gradient? gradient;
  final double borderRadius;
  final List<BoxShadow>? boxShadow;
  final VoidCallback? onTap;
  final bool enableBlur;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.backgroundColor,
    this.gradient,
    this.borderRadius = LiquidGlassTheme.radiusMedium,
    this.boxShadow,
    this.onTap,
    this.enableBlur = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBackground = isDark 
        ? LiquidGlassTheme.glassBlack 
        : LiquidGlassTheme.glassWhite;
    final defaultShadow = isDark 
        ? LiquidGlassTheme.glassShadowDark 
        : LiquidGlassTheme.glassShadow;

    Widget card = Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        gradient: gradient,
        color: gradient == null ? (backgroundColor ?? defaultBackground) : null,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: boxShadow ?? defaultShadow,
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: enableBlur
            ? BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: LiquidGlassTheme.glassBlur,
                  sigmaY: LiquidGlassTheme.glassBlur,
                ),
                child: Padding(
                  padding: padding ?? const EdgeInsets.all(LiquidGlassTheme.spacingM),
                  child: child,
                ),
              )
            : Padding(
                padding: padding ?? const EdgeInsets.all(LiquidGlassTheme.spacingM),
                child: child,
              ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: card,
      );
    }

    return card;
  }
}

class GlassButton extends StatelessWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final bool isLoading;
  final bool isOutlined;

  const GlassButton({
    super.key,
    required this.child,
    this.onPressed,
    this.backgroundColor,
    this.foregroundColor,
    this.padding,
    this.borderRadius = LiquidGlassTheme.radiusMedium,
    this.isLoading = false,
    this.isOutlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBackground = backgroundColor ?? 
        (isDark ? LiquidGlassTheme.glassBlack : LiquidGlassTheme.glassWhite);
    final defaultForeground = foregroundColor ?? 
        (isDark ? Colors.white : Colors.black87);

    return GestureDetector(
      onTap: isLoading ? null : onPressed,
      child: Container(
        padding: padding ?? const EdgeInsets.symmetric(
          horizontal: LiquidGlassTheme.spacingL,
          vertical: LiquidGlassTheme.spacingM,
        ),
        decoration: BoxDecoration(
          color: isOutlined ? Colors.transparent : defaultBackground,
          borderRadius: BorderRadius.circular(borderRadius),
          border: isOutlined ? Border.all(
            color: defaultForeground.withOpacity(0.3),
            width: 1.5,
          ) : null,
          boxShadow: null, // Remove shadows for cleaner liquid glass effect
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(borderRadius),
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: LiquidGlassTheme.glassBlur,
              sigmaY: LiquidGlassTheme.glassBlur,
            ),
            child: Center(
              child: isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(defaultForeground),
                      ),
                    )
                  : DefaultTextStyle(
                      style: TextStyle(
                        color: defaultForeground,
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                      child: child,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;
  final Color? backgroundColor;
  final double borderRadius;
  final List<BoxShadow>? boxShadow;
  final Gradient? gradient;
  final bool enableBlur;

  const GlassContainer({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.backgroundColor,
    this.borderRadius = LiquidGlassTheme.radiusMedium,
    this.boxShadow,
    this.gradient,
    this.enableBlur = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBackground = backgroundColor ?? 
        (isDark ? LiquidGlassTheme.glassBlack : LiquidGlassTheme.glassWhite);
    final defaultShadow = isDark 
        ? LiquidGlassTheme.glassShadowDark 
        : LiquidGlassTheme.glassShadow;

    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        gradient: gradient,
        color: gradient == null ? defaultBackground : null,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: boxShadow ?? defaultShadow,
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: enableBlur
            ? BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: LiquidGlassTheme.glassBlur,
                  sigmaY: LiquidGlassTheme.glassBlur,
                ),
                child: Padding(
                  padding: padding ?? const EdgeInsets.all(LiquidGlassTheme.spacingM),
                  child: child,
                ),
              )
            : Padding(
                padding: padding ?? const EdgeInsets.all(LiquidGlassTheme.spacingM),
                child: child,
              ),
      ),
    );
  }
}

class GlassTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? hintText;
  final String? labelText;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function()? onTap;
  final bool readOnly;
  final int? maxLines;
  final double borderRadius;
  final Color? textColor;
  final Color? labelColor;
  final Color? hintColor;

  const GlassTextField({
    super.key,
    this.controller,
    this.hintText,
    this.labelText,
    this.obscureText = false,
    this.keyboardType,
    this.prefixIcon,
    this.suffixIcon,
    this.validator,
    this.onChanged,
    this.onTap,
    this.readOnly = false,
    this.maxLines = 1,
    this.borderRadius = LiquidGlassTheme.radiusMedium,
    this.textColor,
    this.labelColor,
    this.hintColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBackground = isDark 
        ? LiquidGlassTheme.glassBlack 
        : LiquidGlassTheme.glassWhite;

    return GlassContainer(
      backgroundColor: defaultBackground,
      borderRadius: borderRadius,
      enableBlur: true,
      padding: EdgeInsets.zero,
      child: TextFormField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        validator: validator,
        onChanged: onChanged,
        onTap: onTap,
        readOnly: readOnly,
        maxLines: maxLines,
        style: TextStyle(
          color: textColor ?? (isDark ? Colors.white : Colors.black87),
          fontSize: 16,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          labelText: labelText,
          prefixIcon: prefixIcon,
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          errorBorder: InputBorder.none,
          focusedErrorBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: LiquidGlassTheme.spacingM,
            vertical: LiquidGlassTheme.spacingM,
          ),
          hintStyle: TextStyle(
            color: hintColor ?? (isDark ? Colors.white60 : Colors.black54),
          ),
          labelStyle: TextStyle(
            color: labelColor ?? (isDark ? Colors.white70 : Colors.black87),
          ),
        ),
      ),
    );
  }
}

class GlassAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool centerTitle;
  final Color? backgroundColor;
  final double elevation;

  const GlassAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.centerTitle = true,
    this.backgroundColor,
    this.elevation = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBackground = backgroundColor ?? 
        (isDark ? LiquidGlassTheme.glassBlack : LiquidGlassTheme.glassWhite);

    return AppBar(
      title: Text(
        title,
        style: LiquidGlassTheme.heading4.copyWith(
          color: isDark ? Colors.white : Colors.black87,
        ),
      ),
      actions: actions,
      leading: leading,
      centerTitle: centerTitle,
      backgroundColor: Colors.transparent,
      elevation: elevation,
      flexibleSpace: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(
            sigmaX: LiquidGlassTheme.glassBlur,
            sigmaY: LiquidGlassTheme.glassBlur,
          ),
          child: Container(
            decoration: BoxDecoration(
              color: defaultBackground,
              border: Border(
                bottom: BorderSide(
                  color: Colors.white.withOpacity(0.2),
                  width: 1,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class GlassBottomNavigationBar extends StatelessWidget {
  final int currentIndex;
  final void Function(int) onTap;
  final List<BottomNavigationBarItem> items;
  final Color? backgroundColor;

  const GlassBottomNavigationBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBackground = backgroundColor ?? 
        (isDark ? LiquidGlassTheme.glassBlack : LiquidGlassTheme.glassWhite);

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: LiquidGlassTheme.glassBlur,
          sigmaY: LiquidGlassTheme.glassBlur,
        ),
        child: Container(
          decoration: BoxDecoration(
            color: defaultBackground,
            border: Border(
              top: BorderSide(
                color: Colors.white.withOpacity(0.2),
                width: 1,
              ),
            ),
          ),
          child: BottomNavigationBar(
            currentIndex: currentIndex,
            onTap: onTap,
            items: items,
            backgroundColor: Colors.transparent,
            elevation: 0,
            type: BottomNavigationBarType.fixed,
            selectedItemColor: LiquidGlassTheme.primaryPurple,
            unselectedItemColor: isDark ? Colors.white60 : Colors.black54,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}
