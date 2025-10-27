import 'package:flutter_riverpod/flutter_riverpod.dart';

// Auto Refresh Provider
final autoRefreshProvider = StateNotifierProvider<AutoRefreshNotifier, int>((ref) {
  return AutoRefreshNotifier();
});

class AutoRefreshNotifier extends StateNotifier<int> {
  AutoRefreshNotifier() : super(0);
  
  void manualRefresh() {
    state = state + 1;
  }
}

// WebSocket State Provider (placeholder)
final webSocketStateProvider = StateNotifierProvider<WebSocketNotifier, bool>((ref) {
  return WebSocketNotifier();
});

class WebSocketNotifier extends StateNotifier<bool> {
  WebSocketNotifier() : super(false);
  
  void connect() {
    state = true;
  }
  
  void disconnect() {
    state = false;
  }
}
