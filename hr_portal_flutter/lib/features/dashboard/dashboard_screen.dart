import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../core/providers/providers.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen>
    with TickerProviderStateMixin {
  final List<Map<String, dynamic>> _upcomingHolidays = [];
  final List<Map<String, dynamic>> _upcomingEvents = [];
  final List<Map<String, dynamic>> _leaveTypes = [];
  final List<Map<String, dynamic>> _recentOffSites = [];
  
  Map<String, dynamic>? _dashboardStats;
  bool _isLoadingStats = false;
  late AnimationController _refreshController;

  @override
  void initState() {
    super.initState();
    _refreshController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _loadDashboardData();
  }

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    _refreshController.forward().then((_) => _refreshController.reset());
    
    final user = ref.read(authProvider).user;
    final canViewStats = user?.role == 'Admin' || user?.role == 'God';
    
    if (canViewStats) {
      await _loadDashboardStats();
    }
    
    await Future.wait([
      _loadHolidays(),
      _loadEvents(),
      _loadOffSites(),
    ]);
    
    await _loadLeaveTypes();
  }

  Future<void> _loadHolidays() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _upcomingHolidays.clear();
        if (holidays is List) {
          final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
          
          final filteredHolidays = (holidays as List).where((holiday) => 
            holiday['type'] != 'notice').toList();
          
          // Process multi-day events and filter by date
          for (var holiday in filteredHolidays) {
            bool isUpcoming = false;
            
            if (holiday['dateRange'] != null && holiday['dateRange'].isNotEmpty) {
              // Multi-day event - check if any part of the range is today or future
              final dateRangeStr = holiday['dateRange'].toString();
              // Parse date range (e.g., "2024-12-25 to 2024-12-27")
              if (dateRangeStr.contains(' to ')) {
                final parts = dateRangeStr.split(' to ');
                if (parts.length == 2) {
                  final startDate = DateTime.tryParse(parts[0].trim());
                  final endDate = DateTime.tryParse(parts[1].trim());
                  if (startDate != null && endDate != null) {
                    // Check if the event ends today or later
                    isUpcoming = endDate.isAtSameMomentAs(today) || endDate.isAfter(today);
                  }
                }
              } else {
                // Single date in dateRange field
                final date = DateTime.tryParse(dateRangeStr);
                if (date != null) {
                  isUpcoming = date.isAtSameMomentAs(today) || date.isAfter(today);
                }
              }
              
              if (isUpcoming) {
                _upcomingHolidays.add({
                  ...holiday,
                  'date': holiday['dateRange'],
                  'isMultiDay': true,
                });
              }
            } else if (holiday['date'] != null) {
              // Single day event - check if it's today or future
              final date = DateTime.tryParse(holiday['date'].toString());
              if (date != null) {
                final normalizedDate = DateTime(date.year, date.month, date.day);
                isUpcoming = normalizedDate.isAtSameMomentAs(today) || normalizedDate.isAfter(today);
                
                if (isUpcoming) {
                  _upcomingHolidays.add({
                    ...holiday,
                    'isMultiDay': false,
                  });
                }
              }
            }
          }
        }
      });
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadEvents() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _upcomingEvents.clear();
        
        if (holidays is List) {
          final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
          
          for (var holiday in holidays) {
            if (holiday['type'] == 'notice') {
              bool isUpcoming = false;
              String eventDate = '';
              bool isMultiDay = false;
              
              if (holiday['dateRange'] != null && holiday['dateRange'].isNotEmpty) {
                // Multi-day notice - check if any part of the range is today or future
                final dateRangeStr = holiday['dateRange'].toString();
                if (dateRangeStr.contains(' to ')) {
                  final parts = dateRangeStr.split(' to ');
                  if (parts.length == 2) {
                    final startDate = DateTime.tryParse(parts[0].trim());
                    final endDate = DateTime.tryParse(parts[1].trim());
                    if (startDate != null && endDate != null) {
                      isUpcoming = endDate.isAtSameMomentAs(today) || endDate.isAfter(today);
                    }
                  }
                } else {
                  final date = DateTime.tryParse(dateRangeStr);
                  if (date != null) {
                    isUpcoming = date.isAtSameMomentAs(today) || date.isAfter(today);
                  }
                }
                eventDate = holiday['dateRange'];
                isMultiDay = true;
              } else if (holiday['date'] != null) {
                // Single day notice - check if it's today or future
                final date = DateTime.tryParse(holiday['date'].toString());
                if (date != null) {
                  final normalizedDate = DateTime(date.year, date.month, date.day);
                  isUpcoming = normalizedDate.isAtSameMomentAs(today) || normalizedDate.isAfter(today);
                }
                eventDate = holiday['date'];
                isMultiDay = false;
              } else {
                // Notice without date - always show (ongoing notice)
                isUpcoming = true;
                eventDate = '';
                isMultiDay = false;
              }
              
              if (isUpcoming) {
              _upcomingEvents.add({
                'id': holiday['id'] ?? '',
                'name': holiday['name'] ?? holiday['title'] ?? 'Notice',
                'type': holiday['type'] ?? 'Notice',
                  'date': eventDate,
                  'time': 'All Day',
                  'location': 'Office',
                'description': holiday['description'] ?? '',
                  'color': holiday['color'] ?? LiquidGlassTheme.accentPink.value.toRadixString(16),
                'icon': Icons.notifications,
                'isNotice': true,
                  'isMultiDay': isMultiDay,
              });
              }
            }
          }
        }
        
        _upcomingEvents.sort((a, b) {
          final dateA = DateTime.tryParse(a['date'] ?? '') ?? DateTime.now();
          final dateB = DateTime.tryParse(b['date'] ?? '') ?? DateTime.now();
          return dateA.compareTo(dateB);
        });
        
        final now = DateTime.now();
        _upcomingEvents.removeWhere((event) {
          final eventDate = DateTime.tryParse(event['date'] ?? '') ?? DateTime.now();
          return eventDate.isBefore(now);
        });
        
        if (_upcomingEvents.length > 3) {
          _upcomingEvents.removeRange(3, _upcomingEvents.length);
        }
      });
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadLeaveTypes() async {
    try {
      if (_dashboardStats != null && _dashboardStats!['leave_balances'] != null) {
        final leaveBalances = _dashboardStats!['leave_balances'] as List;
        
        setState(() {
          _leaveTypes.clear();
          
          for (final balance in leaveBalances) {
            final categoryName = balance['category_name'] ?? 'Leave';
            final totalDays = balance['total_days'] ?? 0;
            final usedDays = balance['used_days'] ?? 0;
            final remainingDays = balance['remaining_days'] ?? 0;
            
            _leaveTypes.add({
              'name': categoryName,
              'description': 'Apply for $categoryName',
              'balance': totalDays,
              'used': usedDays,
              'remaining': remainingDays,
              'icon': _getLeaveTypeIcon(categoryName),
              'color': _getLeaveTypeColor(categoryName),
            });
          }
          
          _leaveTypes.add({
            'name': 'LOP',
            'description': 'Loss of Pay',
            'balance': 999,
            'used': 0,
            'remaining': 999,
            'icon': Icons.money_off,
            'color': LiquidGlassTheme.secondaryOrange,
          });
        });
      } else {
        final apiService = ref.read(apiServiceProvider);
        final authState = ref.read(authProvider);
        final currentUser = authState.user;
        
        if (currentUser != null) {
          final leaveBalances = await apiService.getLeaveBalance(currentUser.id);
          
          setState(() {
            _leaveTypes.clear();
            
            for (final balance in leaveBalances) {
              final categoryName = balance['category_name'] ?? 'Leave';
              final totalDays = balance['total_days'] ?? 0;
              final usedDays = balance['used_days'] ?? 0;
              final remainingDays = balance['remaining_days'] ?? 0;
              
              _leaveTypes.add({
                'name': categoryName,
                'description': 'Apply for $categoryName',
                'balance': totalDays,
                'used': usedDays,
                'remaining': remainingDays,
                'icon': _getLeaveTypeIcon(categoryName),
                'color': _getLeaveTypeColor(categoryName),
              });
            }
            
            _leaveTypes.add({
              'name': 'LOP',
              'description': 'Loss of Pay',
              'balance': 999,
              'used': 0,
              'remaining': 999,
              'icon': Icons.money_off,
              'color': LiquidGlassTheme.secondaryOrange,
            });
          });
        }
      }
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadOffSites() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final offSites = await apiService.getOffSites();
      
      setState(() {
        _recentOffSites.clear();
        if (offSites is List) {
          final now = DateTime.now();
          final upcomingOffSites = offSites.where((offSite) {
            final startDate = DateTime.tryParse(offSite['start_date'] ?? '') ?? DateTime.now();
            return startDate.isAfter(now) || startDate.isAtSameMomentAs(now);
          }).toList();
          
          upcomingOffSites.sort((a, b) {
            final dateA = DateTime.tryParse(a['start_date'] ?? '') ?? DateTime.now();
            final dateB = DateTime.tryParse(b['start_date'] ?? '') ?? DateTime.now();
            return dateA.compareTo(dateB);
          });
          
          _recentOffSites.addAll(upcomingOffSites.take(3).cast<Map<String, dynamic>>());
        }
      });
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadDashboardStats() async {
    setState(() {
      _isLoadingStats = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final stats = await apiService.getDashboardStats();
      
      setState(() {
        _dashboardStats = stats;
        _isLoadingStats = false;
      });
      
      await _loadLeaveTypes();
    } catch (e) {
      setState(() {
        _isLoadingStats = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load dashboard stats: ${e.toString()}'),
            backgroundColor: LiquidGlassTheme.accentRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final canViewStats = user?.role == 'Admin' || user?.role == 'God';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(0), // Hide the default app bar
        child: Container(),
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark 
              ? LiquidGlassTheme.darkPrimaryGradient 
              : LiquidGlassTheme.primaryGradient,
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Custom Header that integrates with background
                _buildCustomHeader(context, user?.name ?? 'User')
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 100.ms)
                    .slideY(begin: 0.2, end: 0),
                
                const SizedBox(height: LiquidGlassTheme.spacingXL),
                
                // Quick Stats Grid (Only for HR, Admin, God)
                if (canViewStats) ...[
                  _buildQuickStatsSection(context)
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 200.ms)
                      .slideY(begin: 0.2, end: 0),
                  const SizedBox(height: LiquidGlassTheme.spacingXL),
                ],
                
                // Notices Section
                _buildNoticesSection(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 300.ms)
                    .slideY(begin: 0.2, end: 0),
                
                const SizedBox(height: LiquidGlassTheme.spacingXL),
                
                // Calendar View
                _buildCalendarSection(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 400.ms)
                    .slideY(begin: 0.2, end: 0),
                
                const SizedBox(height: LiquidGlassTheme.spacingXL),
                
                // Upcoming Holidays & Events
                _buildHolidaysSection(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 500.ms)
                    .slideY(begin: 0.2, end: 0),
                
                const SizedBox(height: LiquidGlassTheme.spacingXL),
                
                // Recent Off-site Work
                _buildOffSiteSection(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 600.ms)
                    .slideY(begin: 0.2, end: 0),
                
                const SizedBox(height: LiquidGlassTheme.spacingXL),
                
                // Quick Leave Application
                _buildLeaveApplicationSection(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 700.ms)
                    .slideY(begin: 0.2, end: 0),
                
                const SizedBox(height: LiquidGlassTheme.spacingXXL),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeSection(BuildContext context, String userName) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return GlassCard(
      gradient: isDark 
          ? LiquidGlassTheme.darkPrimaryGradient 
          : LiquidGlassTheme.accentGradient,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back,',
            style: LiquidGlassTheme.bodyLarge.copyWith(
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: LiquidGlassTheme.spacingS),
          Text(
            userName,
            style: LiquidGlassTheme.heading2.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: LiquidGlassTheme.spacingM),
          Text(
            'Here\'s what\'s happening today',
            style: LiquidGlassTheme.bodyMedium.copyWith(
              color: Colors.white60,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomHeader(BuildContext context, String userName) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: LiquidGlassTheme.spacingM,
        vertical: LiquidGlassTheme.spacingL,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome back,',
                  style: LiquidGlassTheme.bodyLarge.copyWith(
                    color: Colors.white70,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: LiquidGlassTheme.spacingXS),
                Text(
                  userName,
                  style: LiquidGlassTheme.heading2.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 24,
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              // Hamburger Menu Button
              IconButton(
                icon: Icon(
                  Icons.menu_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
              const SizedBox(width: LiquidGlassTheme.spacingS),
              // Refresh Button
              IconButton(
                icon: AnimatedBuilder(
                  animation: _refreshController,
                  builder: (context, child) {
                    return Transform.rotate(
                      angle: _refreshController.value * 2 * 3.14159,
                      child: Icon(
                        Icons.refresh_rounded,
                        color: Colors.white70,
                        size: 20,
                      ),
                    );
                  },
                ),
            onPressed: _loadDashboardData,
                tooltip: 'Refresh',
              ),
              IconButton(
                icon: Icon(
                  Icons.menu_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
                onPressed: () => Scaffold.of(context).openDrawer(),
                tooltip: 'Menu',
          ),
        ],
      ),
        ],
      ),
    );
  }

  Widget _buildQuickStatsSection(BuildContext context) {
    return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
          'Quick Stats',
          style: LiquidGlassTheme.heading3.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: LiquidGlassTheme.spacingM),
        _isLoadingStats
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : _dashboardStats != null
                ? AnimationLimiter(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        return GridView.count(
                          crossAxisCount: 2,
                          crossAxisSpacing: LiquidGlassTheme.spacingS,
                          mainAxisSpacing: LiquidGlassTheme.spacingS,
                          childAspectRatio: constraints.maxWidth > 400 ? 1.3 : 1.1,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                      children: [
                        _buildStatCard(
                          context,
                          'Total Employees',
                          _dashboardStats!['total_users']?.toString() ?? '0',
                          Icons.people_rounded,
                          LiquidGlassTheme.accentBlue,
                          onTap: () => context.go('/employees'),
                        ),
                        _buildStatCard(
                          context,
                          'Pending Leaves',
                          _dashboardStats!['pending_leaves']?.toString() ?? '0',
                          Icons.event_busy_rounded,
                          LiquidGlassTheme.secondaryOrange,
                          onTap: () => context.go('/leaves'),
                        ),
                        _buildStatCard(
                          context,
                          'Approved Leaves',
                          _dashboardStats!['approved_leaves']?.toString() ?? '0',
                          Icons.check_circle_rounded,
                          LiquidGlassTheme.accentGreen,
                          onTap: () => context.go('/leaves'),
                        ),
                        _buildStatCard(
                          context,
                          'Documents',
                          _dashboardStats!['total_documents']?.toString() ?? '0',
                          Icons.description_rounded,
                          LiquidGlassTheme.primaryPurpleLight,
                          onTap: () => context.go('/documents'),
                        ),
                      ].asMap().entries.map((entry) {
                        return AnimationConfiguration.staggeredGrid(
                          position: entry.key,
                          duration: const Duration(milliseconds: 375),
                          columnCount: 2,
                          child: ScaleAnimation(
                            child: FadeInAnimation(
                              child: entry.value,
                            ),
                          ),
                        );
                      }).toList(),
                        );
                      },
                    ),
                  )
                : const Center(
                    child: Text(
                      'No stats available',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
      ],
    );
  }

  Widget _buildNoticesSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
              'Upcoming Events & Notices',
              style: LiquidGlassTheme.heading3.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 20,
                  ),
                ),
                TextButton(
              onPressed: () => context.go('/holidays'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.white70,
                padding: const EdgeInsets.symmetric(
                  horizontal: LiquidGlassTheme.spacingM,
                  vertical: LiquidGlassTheme.spacingS,
                ),
              ),
                  child: const Text('View All'),
                ),
              ],
            ),
        const SizedBox(height: LiquidGlassTheme.spacingM),
            _upcomingEvents.isEmpty
            ? GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: const Center(
                    child: Padding(
                    padding: EdgeInsets.all(LiquidGlassTheme.spacingXL),
                      child: Text(
                        'No notices available',
                      style: TextStyle(color: Colors.white70),
                    ),
                      ),
                    ),
                  )
            : AnimationLimiter(
                child: Column(
                  children: _upcomingEvents.asMap().entries.map((entry) {
                    return AnimationConfiguration.staggeredList(
                      position: entry.key,
                      duration: const Duration(milliseconds: 375),
                      child: SlideAnimation(
                        verticalOffset: 50.0,
                        child: FadeInAnimation(
                          child: _buildEventCard(context, entry.value),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
      ],
    );
  }

  Widget _buildCalendarSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
            Text(
          'Upcoming Leaves & Holidays',
          style: LiquidGlassTheme.heading3.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: LiquidGlassTheme.spacingM),
            _buildCalendarView(),
      ],
    );
  }

  Widget _buildHolidaysSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
              'Upcoming Holidays',
              style: LiquidGlassTheme.heading3.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 20,
                  ),
                ),
                TextButton(
              onPressed: () => context.go('/holidays'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.white70,
                padding: const EdgeInsets.symmetric(
                  horizontal: LiquidGlassTheme.spacingM,
                  vertical: LiquidGlassTheme.spacingS,
                ),
              ),
                  child: const Text('View All'),
                ),
              ],
            ),
        const SizedBox(height: LiquidGlassTheme.spacingM),
            _upcomingHolidays.isEmpty
            ? GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: const Center(
                    child: Padding(
                    padding: EdgeInsets.all(LiquidGlassTheme.spacingXL),
                      child: Text(
                        'No upcoming holidays',
                      style: TextStyle(color: Colors.white70),
                    ),
                      ),
                    ),
                  )
                : SizedBox(
                height: 140,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _upcomingHolidays.length,
                      itemBuilder: (context, index) {
                    return AnimationConfiguration.staggeredList(
                      position: index,
                      duration: const Duration(milliseconds: 375),
                      child: SlideAnimation(
                        horizontalOffset: 50.0,
                        child: FadeInAnimation(
                          child: _buildHolidayCard(context, _upcomingHolidays[index]),
                        ),
                      ),
                    );
                      },
                    ),
                  ),
      ],
    );
  }

  Widget _buildOffSiteSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Off-site Work',
              style: LiquidGlassTheme.heading3.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 20,
                  ),
                ),
                TextButton(
              onPressed: () => context.go('/off-site'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.white70,
                padding: const EdgeInsets.symmetric(
                  horizontal: LiquidGlassTheme.spacingM,
                  vertical: LiquidGlassTheme.spacingS,
                ),
              ),
                  child: const Text('View All'),
                ),
              ],
            ),
        const SizedBox(height: LiquidGlassTheme.spacingM),
            _recentOffSites.isEmpty
            ? GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: const Center(
                    child: Padding(
                    padding: EdgeInsets.all(LiquidGlassTheme.spacingXL),
                      child: Text(
                        'No upcoming off-site work',
                      style: TextStyle(color: Colors.white70),
                    ),
                      ),
                    ),
                  )
            : AnimationLimiter(
                child: Column(
                  children: _recentOffSites.asMap().entries.map((entry) {
                    return AnimationConfiguration.staggeredList(
                      position: entry.key,
                      duration: const Duration(milliseconds: 375),
                      child: SlideAnimation(
                        verticalOffset: 50.0,
                        child: FadeInAnimation(
                          child: _buildOffSiteCard(context, entry.value),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
      ],
    );
  }

  Widget _buildLeaveApplicationSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
            Text(
              'Quick Leave Application',
          style: LiquidGlassTheme.heading3.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: LiquidGlassTheme.spacingM),
            _leaveTypes.isEmpty
            ? GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: const Center(
                    child: Padding(
                    padding: EdgeInsets.all(LiquidGlassTheme.spacingXL),
                      child: Text(
                        'No leave types available',
                      style: TextStyle(color: Colors.white70),
                    ),
                      ),
                    ),
                  )
            : AnimationLimiter(
                child: GridView.count(
                    crossAxisCount: 2,
                  crossAxisSpacing: LiquidGlassTheme.spacingM,
                  mainAxisSpacing: LiquidGlassTheme.spacingM,
                    childAspectRatio: 1.1,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                  children: _leaveTypes.asMap().entries.map((entry) {
                    return AnimationConfiguration.staggeredGrid(
                      position: entry.key,
                      duration: const Duration(milliseconds: 375),
                      columnCount: 2,
                      child: ScaleAnimation(
                        child: FadeInAnimation(
                          child: _buildLeaveTypeCard(context, entry.value),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
      ],
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color, {
    VoidCallback? onTap,
  }) {
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.15),
        onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
          Container(
            padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
            ),
            child: Icon(
                icon,
              size: 20,
              color: Colors.white,
              ),
          ),
          const SizedBox(height: LiquidGlassTheme.spacingS),
              Text(
                value,
            style: LiquidGlassTheme.heading3.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: LiquidGlassTheme.spacingXS),
          Text(
                  title,
            style: LiquidGlassTheme.bodySmall.copyWith(
              color: Colors.white70,
              fontSize: 12,
            ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
              ),
            ],
      ),
    );
  }

  Widget _buildLeaveTypeCard(BuildContext context, Map<String, dynamic> leaveType) {
    final balance = leaveType['balance'] as int;
    final used = leaveType['used'] as int;
    final remaining = balance - used;
    
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.15),
      onTap: () => _showLeaveApplicationDialog(context, leaveType['name']),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
          Container(
            padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
            decoration: BoxDecoration(
              color: _parseColor(leaveType['color']).withOpacity(0.2),
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
            ),
            child: Icon(
                leaveType['icon'],
                size: 32,
              color: Colors.white,
              ),
          ),
          const SizedBox(height: LiquidGlassTheme.spacingM),
              Text(
                leaveType['name'],
            style: LiquidGlassTheme.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: Colors.white,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
          const SizedBox(height: LiquidGlassTheme.spacingS),
              if (leaveType['name'].toString().toLowerCase() != 'lop' && 
                  leaveType['name'].toString().toLowerCase() != 'loss of pay')
                Container(
              padding: const EdgeInsets.symmetric(
                horizontal: LiquidGlassTheme.spacingS,
                vertical: LiquidGlassTheme.spacingXS,
              ),
                  decoration: BoxDecoration(
                color: _parseColor(leaveType['color']).withOpacity(0.3),
                borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
                  ),
                  child: Text(
                    '$remaining/$balance left',
                style: LiquidGlassTheme.caption.copyWith(
                      fontWeight: FontWeight.w600,
                  color: Colors.white,
                    ),
                  ),
                ),
            ],
      ),
    );
  }

  Widget _buildHolidayCard(BuildContext context, Map<String, dynamic> holiday) {
    return Container(
      width: 200,
      margin: const EdgeInsets.only(right: LiquidGlassTheme.spacingM),
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _parseColor(holiday['color']),
                      shape: BoxShape.circle,
                    ),
                  ),
                const SizedBox(width: LiquidGlassTheme.spacingS),
                  Expanded(
                    child: Text(
                    holiday['name'] ?? 'Unknown Holiday',
                    style: LiquidGlassTheme.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: LiquidGlassTheme.spacingS),
              Text(
              _formatHolidayDate(holiday['date']),
              style: LiquidGlassTheme.bodySmall.copyWith(
                color: LiquidGlassTheme.secondaryOrangeLight,
                  fontSize: 12,
                ),
              ),
            const SizedBox(height: LiquidGlassTheme.spacingXS),
              Text(
              holiday['type'] ?? 'Holiday',
              style: LiquidGlassTheme.caption.copyWith(
                  color: _parseColor(holiday['color']),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
        ),
      ),
    );
  }

  Widget _buildEventCard(BuildContext context, Map<String, dynamic> event) {
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.15),
      margin: const EdgeInsets.only(bottom: LiquidGlassTheme.spacingM),
      child: Row(
        children: [
          Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
              color: LiquidGlassTheme.primaryPurple.withOpacity(0.2),
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
            ),
            child: const Icon(
              Icons.event_rounded,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: LiquidGlassTheme.spacingM),
          Expanded(
            child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
                Text(
                  event['name'] ?? 'Unknown Event',
                  style: LiquidGlassTheme.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: LiquidGlassTheme.spacingXS),
                Text(
                  '${_formatEventDate(event['date'])} at ${event['time'] ?? 'No time'}',
                  style: LiquidGlassTheme.bodySmall.copyWith(
                    color: Colors.white70,
                  ),
                ),
            Text(
              event['location'] ?? 'No location',
                  style: LiquidGlassTheme.caption.copyWith(
                    color: LiquidGlassTheme.secondaryOrangeLight,
              ),
            ),
          ],
        ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: LiquidGlassTheme.spacingS,
              vertical: LiquidGlassTheme.spacingXS,
            ),
          decoration: BoxDecoration(
              color: LiquidGlassTheme.primaryPurple.withOpacity(0.2),
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
          ),
          child: Text(
            event['type'] ?? 'Event',
              style: LiquidGlassTheme.caption.copyWith(
                color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ],
      ),
    );
  }

  Widget _buildOffSiteCard(BuildContext context, Map<String, dynamic> offSite) {
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.15),
      margin: const EdgeInsets.only(bottom: LiquidGlassTheme.spacingM),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: LiquidGlassTheme.primaryPurpleLight.withOpacity(0.2),
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
            ),
            child: const Icon(
              Icons.work_outline_rounded,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: LiquidGlassTheme.spacingM),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  offSite['title'] ?? 'Untitled',
                  style: LiquidGlassTheme.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: LiquidGlassTheme.spacingXS),
                Text(
                  '${_formatDate(offSite['start_date'])} - ${_formatDate(offSite['end_date'])}',
                  style: LiquidGlassTheme.bodySmall.copyWith(
                    color: Colors.white70,
                  ),
                ),
                if (offSite['location'] != null && offSite['location'].isNotEmpty)
                  Text(
                    offSite['location'],
                    style: LiquidGlassTheme.caption.copyWith(
                      color: LiquidGlassTheme.secondaryOrangeLight,
                    ),
                  ),
              ],
            ),
          ),
          _buildOffSiteStatusChip(offSite['status'] ?? 'planned'),
        ],
      ),
    );
  }

  Widget _buildOffSiteStatusChip(String status) {
    Color color;
    String label;
    
    switch (status.toLowerCase()) {
      case 'planned':
        color = LiquidGlassTheme.accentBlue;
        label = 'Planned';
        break;
      case 'in_progress':
        color = LiquidGlassTheme.secondaryOrange;
        label = 'In Progress';
        break;
      case 'completed':
        color = LiquidGlassTheme.accentGreen;
        label = 'Completed';
        break;
      case 'cancelled':
        color = LiquidGlassTheme.accentRed;
        label = 'Cancelled';
        break;
      default:
        color = Colors.grey;
        label = 'Unknown';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: LiquidGlassTheme.spacingS,
        vertical: LiquidGlassTheme.spacingXS,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: LiquidGlassTheme.caption.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildCalendarView() {
    final now = DateTime.now();
    final currentMonth = now.month;
    final currentYear = now.year;
    final firstDayOfMonth = DateTime(currentYear, currentMonth, 1);
    final lastDayOfMonth = DateTime(currentYear, currentMonth + 1, 0);
    final firstWeekday = firstDayOfMonth.weekday;
    
    final monthEvents = <DateTime, List<Map<String, dynamic>>>{};
    
    for (final holiday in _upcomingHolidays) {
      final date = DateTime.tryParse(holiday['date'] ?? '');
      if (date != null && date.month == currentMonth && date.year == currentYear) {
        monthEvents[date] = (monthEvents[date] ?? [])..add({
          'title': holiday['name'] ?? 'Holiday',
          'type': 'holiday',
          'color': LiquidGlassTheme.accentRed,
        });
      }
    }
    
    for (final offSite in _recentOffSites) {
      final startDate = DateTime.tryParse(offSite['start_date'] ?? '');
      final endDate = DateTime.tryParse(offSite['end_date'] ?? '');
      if (startDate != null && endDate != null) {
        var currentDate = DateTime(startDate.year, startDate.month, startDate.day);
        final endDateOnly = DateTime(endDate.year, endDate.month, endDate.day);
        
        while (currentDate.isBefore(endDateOnly.add(const Duration(days: 1)))) {
          if (currentDate.month == currentMonth && currentDate.year == currentYear) {
            monthEvents[currentDate] = (monthEvents[currentDate] ?? [])..add({
              'title': offSite['title'] ?? 'Off-site',
              'type': 'offsite',
              'color': LiquidGlassTheme.secondaryOrange,
            });
          }
          currentDate = currentDate.add(const Duration(days: 1));
        }
      }
    }
    
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.15),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${_getMonthName(currentMonth)} $currentYear',
                style: LiquidGlassTheme.heading4.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  fontSize: 18,
                ),
              ),
              Row(
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.chevron_left_rounded, 
                      color: Colors.white,
                      size: 20,
                    ),
                    onPressed: () {
                      // TODO: Navigate to previous month
                    },
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.chevron_right_rounded, 
                      color: Colors.white,
                      size: 20,
                    ),
                    onPressed: () {
                      // TODO: Navigate to next month
                    },
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: LiquidGlassTheme.spacingM),
          
          LayoutBuilder(
            builder: (context, constraints) {
              final cellSize = (constraints.maxWidth - 32) / 7; // Account for padding
              return Table(
                children: [
                  TableRow(
                    children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                        .map((day) => Padding(
                              padding: const EdgeInsets.all(4),
                              child: Text(
                                day,
                                textAlign: TextAlign.center,
                                style: LiquidGlassTheme.bodySmall.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white60,
                                  fontSize: 12,
                                ),
                              ),
                            ))
                        .toList(),
                  ),
              
              ...List.generate(6, (weekIndex) {
                return TableRow(
                  children: List.generate(7, (dayIndex) {
                    final dayNumber = weekIndex * 7 + dayIndex - firstWeekday + 2;
                    final isCurrentMonth = dayNumber >= 1 && dayNumber <= lastDayOfMonth.day;
                    final isToday = isCurrentMonth && 
                        dayNumber == now.day && 
                        currentMonth == now.month && 
                        currentYear == now.year;
                    
                    if (!isCurrentMonth) {
                      return SizedBox(height: cellSize);
                    }
                    
                    final dayDate = DateTime(currentYear, currentMonth, dayNumber);
                    final dayEvents = monthEvents[dayDate] ?? [];
                    
                    return Container(
                      height: cellSize,
                      margin: const EdgeInsets.all(1),
                      decoration: BoxDecoration(
                        color: isToday ? LiquidGlassTheme.primaryPurple.withOpacity(0.3) : null,
                        borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
                        border: isToday ? Border.all(color: LiquidGlassTheme.primaryPurple) : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dayNumber.toString(),
                            style: LiquidGlassTheme.bodySmall.copyWith(
                              fontWeight: isToday ? FontWeight.w600 : FontWeight.normal,
                              color: isToday ? Colors.white : Colors.white70,
                              fontSize: cellSize > 30 ? 12 : 10,
                            ),
                          ),
                          if (dayEvents.isNotEmpty && cellSize > 25)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: dayEvents.take(3).map((event) {
                                return Container(
                                  width: cellSize > 30 ? 4 : 3,
                                  height: cellSize > 30 ? 4 : 3,
                                  margin: const EdgeInsets.symmetric(horizontal: 0.5),
                                  decoration: BoxDecoration(
                                    color: event['color'],
                                    shape: BoxShape.circle,
                                  ),
                                );
                              }).toList(),
                            ),
                        ],
                      ),
                    );
                  }),
                );
              }),
            ],
          );
            },
          ),
          
          const SizedBox(height: LiquidGlassTheme.spacingM),
          
          Wrap(
            spacing: LiquidGlassTheme.spacingM,
            runSpacing: LiquidGlassTheme.spacingS,
            children: [
              _buildLegendItem('Holidays', LiquidGlassTheme.accentRed),
              _buildLegendItem('Off-site', LiquidGlassTheme.secondaryOrange),
              _buildLegendItem('Today', LiquidGlassTheme.primaryPurple),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: LiquidGlassTheme.spacingS),
        Text(
          label,
          style: LiquidGlassTheme.bodySmall.copyWith(
            color: Colors.white70,
          ),
        ),
      ],
    );
  }

  void _showLeaveApplicationDialog(BuildContext context, String leaveType) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final authState = ref.read(authProvider);
      final currentUser = authState.user;
      
      if (currentUser != null) {
        final leaveBalance = await apiService.getLeaveBalance(currentUser.id);
        
        final availableTypes = <String>[];
        
        for (final balance in leaveBalance) {
          final type = balance['category_name'] ?? balance['type'] ?? 'Leave';
          availableTypes.add(type);
        }
        
        availableTypes.add('LOP');
        
        if (!availableTypes.contains(leaveType)) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$leaveType is not available. Please contact HR to set up your leave allocations.'),
              backgroundColor: LiquidGlassTheme.accentRed,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
              ),
            ),
          );
          return;
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to check leave availability. Please try again.'),
          backgroundColor: LiquidGlassTheme.accentRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
          ),
        ),
      );
      return;
    }

    final startDateController = TextEditingController();
    final endDateController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          backgroundColor: Colors.transparent,
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
                Text(
                  'Apply $leaveType',
                  style: LiquidGlassTheme.heading4.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              const SizedBox(height: LiquidGlassTheme.spacingL),
              GlassTextField(
                controller: startDateController,
                  labelText: 'Start Date',
                  hintText: 'Select start date',
                readOnly: true,
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null) {
                    startDateController.text = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                    setState(() {}); // Trigger rebuild to enable/disable submit button
                  }
                },
              ),
              const SizedBox(height: LiquidGlassTheme.spacingM),
              GlassTextField(
                controller: endDateController,
                  labelText: 'End Date',
                  hintText: 'Select end date',
                readOnly: true,
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null) {
                    endDateController.text = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                    setState(() {}); // Trigger rebuild to enable/disable submit button
                  }
                },
              ),
              const SizedBox(height: LiquidGlassTheme.spacingM),
              GlassTextField(
                controller: reasonController,
                  labelText: 'Reason',
                  hintText: 'Enter reason for leave',
                maxLines: 3,
                onChanged: (value) => setState(() {}), // Trigger rebuild to enable/disable submit button
              ),
              const SizedBox(height: LiquidGlassTheme.spacingL),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  GlassButton(
            onPressed: () => Navigator.pop(context),
                    backgroundColor: Colors.white.withOpacity(0.2),
                    foregroundColor: Colors.white,
            child: const Text('Cancel'),
          ),
                  GlassButton(
            onPressed: startDateController.text.isNotEmpty && 
                       endDateController.text.isNotEmpty && 
                       reasonController.text.isNotEmpty
                ? () async {
                    try {
                      final apiService = ref.read(apiServiceProvider);
                              final authState = ref.read(authProvider);
                              final currentUser = authState.user;
                              
                              if (currentUser == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: const Text('User not found. Please login again.'),
                                    backgroundColor: LiquidGlassTheme.accentRed,
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                                    ),
                                  ),
                                );
                                return;
                              }
                              
                              // Parse dates
                              final fromDate = DateTime.parse(startDateController.text);
                              final toDate = DateTime.parse(endDateController.text);
                              
                              // Get leave categories to find the category_id for the leave type
                              final categories = await apiService.getLeaveCategories();
                              String? categoryId;
                              
                              for (final category in categories) {
                                if (category['name']?.toString().toLowerCase() == leaveType.toLowerCase()) {
                                  categoryId = category['id']?.toString();
                                  break;
                                }
                              }
                              
                              if (categoryId == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Leave category "$leaveType" not found. Please contact HR.'),
                                    backgroundColor: LiquidGlassTheme.accentRed,
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                                    ),
                                  ),
                                );
                                return;
                              }
                              
                              final leaveData = {
                                'user_id': currentUser.id,
                                'organization_id': currentUser.organizationId,
                                'category_id': categoryId,
                        'type': leaveType,
                        'reason': reasonController.text,
                                'from_date': fromDate.toIso8601String(),
                                'to_date': toDate.toIso8601String(),
                                'start_half': 'FULL',
                                'end_half': 'FULL',
                              };
                              
                              await apiService.createLeave(leaveData);
                      
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('$leaveType application submitted successfully'),
                                  backgroundColor: LiquidGlassTheme.accentGreen,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                                  ),
                                ),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Failed to submit leave application: ${e.toString()}'),
                                  backgroundColor: LiquidGlassTheme.accentRed,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                                  ),
                                ),
                      );
                    }
                  }
                : null,
                    backgroundColor: startDateController.text.isNotEmpty && 
                                   endDateController.text.isNotEmpty && 
                                   reasonController.text.isNotEmpty
                        ? LiquidGlassTheme.primaryPurple
                        : Colors.white.withOpacity(0.2),
                    foregroundColor: startDateController.text.isNotEmpty && 
                                   endDateController.text.isNotEmpty && 
                                   reasonController.text.isNotEmpty
                        ? Colors.white
                        : Colors.white60,
            child: const Text('Submit'),
          ),
        ],
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }

  IconData _getLeaveTypeIcon(String? leaveType) {
    if (leaveType == null) return Icons.event_rounded;
    
    switch (leaveType.toLowerCase()) {
      case 'sick leave':
      case 'sick':
        return Icons.medical_services_rounded;
      case 'casual leave':
      case 'casual':
        return Icons.beach_access_rounded;
      case 'professional leave':
      case 'professional':
        return Icons.business_rounded;
      case 'lop':
      case 'loss of pay':
        return Icons.money_off_rounded;
      default:
        return Icons.event_rounded;
    }
  }

  Color _getLeaveTypeColor(String? leaveType) {
    if (leaveType == null) return LiquidGlassTheme.primaryPurple;
    
    switch (leaveType.toLowerCase()) {
      case 'sick leave':
      case 'sick':
        return LiquidGlassTheme.accentRed;
      case 'casual leave':
      case 'casual':
        return LiquidGlassTheme.accentBlue;
      case 'professional leave':
      case 'professional':
        return LiquidGlassTheme.accentGreen;
      case 'lop':
      case 'loss of pay':
        return LiquidGlassTheme.secondaryOrange;
      default:
        return LiquidGlassTheme.primaryPurple;
    }
  }

  String _formatEventDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'No date';
    
    try {
      if (dateString.contains(' to ')) {
        final parts = dateString.split(' to ');
        if (parts.length == 2) {
          final startDate = DateTime.parse(parts[0].trim());
          final endDate = DateTime.parse(parts[1].trim());
          return '${startDate.day}/${startDate.month}/${startDate.year} - ${endDate.day}/${endDate.month}/${endDate.year}';
        }
      }
      
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'No date';
    
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  Color _parseColor(dynamic colorValue) {
    if (colorValue == null) return LiquidGlassTheme.primaryPurple;
    
    if (colorValue is Color) return colorValue;
    
    if (colorValue is String) {
      String hexColor = colorValue.replaceAll('#', '');
      if (hexColor.length == 6) {
        return Color(int.parse('FF$hexColor', radix: 16));
      } else if (hexColor.length == 8) {
        return Color(int.parse(hexColor, radix: 16));
      }
      
      switch (colorValue.toLowerCase()) {
        case 'red':
          return LiquidGlassTheme.accentRed;
        case 'blue':
          return LiquidGlassTheme.accentBlue;
        case 'green':
          return LiquidGlassTheme.accentGreen;
        case 'orange':
          return LiquidGlassTheme.secondaryOrange;
        case 'purple':
          return LiquidGlassTheme.primaryPurple;
        case 'yellow':
          return Colors.yellow;
        case 'pink':
          return LiquidGlassTheme.accentPink;
        case 'teal':
          return Colors.teal;
        case 'cyan':
          return Colors.cyan;
        case 'indigo':
          return Colors.indigo;
        case 'brown':
          return Colors.brown;
        case 'grey':
        case 'gray':
          return Colors.grey;
        default:
          return LiquidGlassTheme.primaryPurple;
      }
    }
    
    return LiquidGlassTheme.primaryPurple;
  }

  String _formatHolidayDate(dynamic dateValue) {
    if (dateValue == null) return 'No date';
    
    try {
      final date = DateTime.parse(dateValue.toString());
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      final day = date.day.toString().padLeft(2, '0');
      final month = months[date.month - 1];
      final year = date.year.toString().substring(2);
      
      return '$day $month $year';
    } catch (e) {
      return dateValue.toString();
    }
  }

  String _getMonthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }
}
