import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_drawer.dart';

class ProfileScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // TODO: Navigate to edit profile
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Profile Screen - Coming Soon'),
      ),
    );
  }
}

class TeamScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Team'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              // TODO: Implement refresh
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Team Screen - Coming Soon'),
      ),
    );
  }
}

class EmployeesScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employees'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              // TODO: Implement refresh
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Employees Screen - Coming Soon'),
      ),
    );
  }
}

class LeavesScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leaves'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              // TODO: Implement refresh
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Leaves Screen - Coming Soon'),
      ),
    );
  }
}

class DocumentsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              // TODO: Implement refresh
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Documents Screen - Coming Soon'),
      ),
    );
  }
}

class SalarySlipsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Salary Slips'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              // TODO: Implement refresh
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Salary Slips Screen - Coming Soon'),
      ),
    );
  }
}

class SettingsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Settings Screen - Coming Soon'),
      ),
    );
  }
}
