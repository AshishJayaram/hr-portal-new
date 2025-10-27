import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await generateAppIcon();
}

Future<void> generateAppIcon() async {
  // Create a 1024x1024 canvas for the app icon
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  const size = Size(1024, 1024);
  
  // Draw the gradient background (blue to green)
  final gradient = const LinearGradient(
    begin: Alignment.bottomLeft,
    end: Alignment.topRight,
    colors: [
      Color(0xFF1E3A8A), // Deep blue
      Color(0xFF10B981), // Vibrant green
    ],
  );
  
  final rect = Rect.fromLTWH(0, 0, size.width, size.height);
  final paint = Paint()..shader = gradient.createShader(rect);
  canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(200)), paint);
  
  // Draw the white circular outline
  const center = Offset(512, 512);
  const circleRadius = 358.0;
  
  final circlePaint = Paint()
    ..color = Colors.white
    ..style = PaintingStyle.stroke
    ..strokeWidth = 82;
  
  canvas.drawCircle(center, circleRadius, circlePaint);
  
  // Draw the bar chart (three vertical bars)
  const barWidth = 82.0;
  const barSpacing = 92.0;
  const barStartX = 420.0;
  const barBottomY = 774.0;
  
  final barPaint = Paint()..color = const Color(0xFF14B8A6); // Teal color
  
  // First bar (shortest)
  const bar1Height = 154.0;
  canvas.drawRRect(
    RRect.fromRectAndRadius(
      Rect.fromLTWH(
        barStartX,
        barBottomY - bar1Height,
        barWidth,
        bar1Height,
      ),
      const Radius.circular(41),
    ),
    barPaint,
  );
  
  // Second bar (medium)
  const bar2Height = 194.0;
  canvas.drawRRect(
    RRect.fromRectAndRadius(
      Rect.fromLTWH(
        barStartX + barSpacing,
        barBottomY - bar2Height,
        barWidth,
        bar2Height,
      ),
      const Radius.circular(41),
    ),
    barPaint,
  );
  
  // Third bar (tallest)
  const bar3Height = 234.0;
  canvas.drawRRect(
    RRect.fromRectAndRadius(
      Rect.fromLTWH(
        barStartX + barSpacing * 2,
        barBottomY - bar3Height,
        barWidth,
        bar3Height,
      ),
      const Radius.circular(41),
    ),
    barPaint,
  );
  
  // Draw the person icon (overlapping the tallest bar)
  final personPaint = Paint()..color = const Color(0xFF14B8A6); // Teal color
  
  // Person head (circle)
  const headRadius = 82.0;
  const headCenter = Offset(645, 480);
  canvas.drawCircle(headCenter, headRadius, personPaint);
  
  // Person body (rectangle)
  const bodyWidth = 164.0;
  const bodyHeight = 123.0;
  const bodyTop = 562.0;
  const bodyLeft = 563.0;
  
  canvas.drawRRect(
    RRect.fromRectAndRadius(
      Rect.fromLTWH(
        bodyLeft,
        bodyTop,
        bodyWidth,
        bodyHeight,
      ),
      const Radius.circular(20),
    ),
    personPaint,
  );
  
  // Convert to image
  final picture = recorder.endRecording();
  final image = await picture.toImage(size.width.toInt(), size.height.toInt());
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  
  // Save the image
  final file = File('assets/icon/hr_portal_icon.png');
  await file.writeAsBytes(byteData!.buffer.asUint8List());
  
  print('App icon generated successfully at: ${file.path}');
}
