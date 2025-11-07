"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getCurrentUser } from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import Calendar from "../../components/Calendar";
import Card from "@/components/ui/Card";
import { motion } from "framer-motion";
import RoleGuard from "../../components/RoleGuard";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function DashboardPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const userRole = user?.role || "Employee";


  // Single API call for all dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardStats,
  });


  if (isLoading) return <Loader />;


  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Dashboard</h1>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error loading dashboard data</h3>
          <p className="text-red-300 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Group leaves by date for Admin/HR users
  const groupLeavesByDate = (leaves: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    
    leaves.forEach((leave) => {
      const startDate = new Date(leave.from_date || leave.from);
      const endDate = new Date(leave.to_date || leave.to);
      
      // Add leave to each date in the range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(leave);
      }
    });
    
    return grouped;
  };

  // Helper to create all-day leave event with exclusive end for proper multi-day visibility
  const createLeaveEvent = (leave: any, isCurrentUser: boolean, title: string, employees: any[], count: number) => {
    const startDate = new Date(leave.from_date || leave.from);
    const endDate = new Date(leave.to_date || leave.to);
    
    // For all-day events, FullCalendar treats 'end' as exclusive
    // So we add 1 day to make the end date inclusive and visible for multi-day leaves
    const endExclusive = new Date(endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    
    return {
      title,
      start: startDate,
      end: endExclusive,
      allDay: true,
      color: isCurrentUser ? "#10b981" : "#6366f1",
      extendedProps: {
        type: 'leave',
        employees,
        count,
        isCurrentUser,
        hasCurrentUser: isCurrentUser
      }
    };
  };

  // Helper to get date key for grouping
  const getDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper to create daywise grouped events
  // Groups leaves and off-sites separately when multiple occur on the same day
  // Removes individual events when they're part of a grouped event
  const createDaywiseGroupedEvents = (
    allEvents: any[],
    groupedEventsByDate: Map<string, any[]>
  ): any[] => {
    const finalEvents: any[] = [];
    const processedEventIds = new Set<string>();
    const processedDates = new Set<string>();
    
    // Track dates that have grouped events (so we can exclude individual events on those dates)
    const datesWithGroupedLeaves = new Set<string>();
    const datesWithGroupedOffsites = new Set<string>();
    const datesWithGroupedHolidays = new Set<string>();

    // Process each date that has events
    groupedEventsByDate.forEach((dayEvents, dateKey) => {
      if (processedDates.has(dateKey)) return;
      
      // Group by type - keep leaves, off-sites (my vs team), holidays, birthdays, and work anniversaries separate
      const leaves = dayEvents.filter(e => e.extendedProps?.type === 'leave');
      const holidays = dayEvents.filter(e => e.extendedProps?.type === 'holiday');
      const birthdays = dayEvents.filter(e => e.extendedProps?.type === 'birthday');
      const anniversaries = dayEvents.filter(e => e.extendedProps?.type === 'anniversary');
      const myOffsites = dayEvents.filter(e => e.extendedProps?.type === 'offsite' && e.extendedProps?.isMyOffSite === true);
      const teamOffsites = dayEvents.filter(e => e.extendedProps?.type === 'offsite' && e.extendedProps?.isMyOffSite !== true);
      const otherEvents = dayEvents.filter(e => 
        e.extendedProps?.type !== 'leave' && 
        e.extendedProps?.type !== 'holiday' && 
        e.extendedProps?.type !== 'offsite' &&
        e.extendedProps?.type !== 'birthday' &&
        e.extendedProps?.type !== 'anniversary'
      );

      const day = new Date(dateKey + 'T00:00:00');
      const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      
      // Group LEAVES separately - if more than one leave on this day, group them
      if (leaves.length > 1) {
        const eventId = `grouped-leave-${dateKey}`;
        if (!processedEventIds.has(eventId)) {
          processedEventIds.add(eventId);
          datesWithGroupedLeaves.add(dateKey); // Mark this date as having grouped leaves
          
          // Collect all unique employees from all leaves on this day
          const allEmployees = leaves.flatMap(e => e.extendedProps?.employees || []);
          // Remove duplicates by name and type
          const uniqueEmployees = Array.from(
            new Map(allEmployees.map((emp: any) => [`${emp.name}-${emp.type}`, emp])).values()
          );
          
          finalEvents.push({
            title: `${leaves.length} employees on leave`,
            start: day,
            end: dayEnd,
            allDay: true,
            color: "#6366f1",
            extendedProps: {
              type: 'leave',
              employees: uniqueEmployees,
              count: leaves.length,
              grouped: true
            }
          });
          // Mark ALL individual leaves for this day as processed (so they don't show individually)
          leaves.forEach(e => {
            const eId = `${getDateKey(new Date(e.start))}-${e.title}`;
            processedEventIds.add(eId);
            // Also mark by date to exclude from multi-day events on this date
            const dateId = `${getDateKey(new Date(e.start))}-leave-${e.title}`;
            processedEventIds.add(dateId);
          });
        }
      } else if (leaves.length === 1) {
        // Single leave - show individually (only if not part of a grouped day)
        if (!datesWithGroupedLeaves.has(dateKey)) {
          const eventId = `${getDateKey(new Date(leaves[0].start))}-${leaves[0].title}`;
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId);
            finalEvents.push(leaves[0]);
          }
        }
      }
      
      // Group HOLIDAYS if multiple on same day
      if (holidays.length > 1) {
        const eventId = `grouped-holiday-${dateKey}`;
        if (!processedEventIds.has(eventId)) {
          processedEventIds.add(eventId);
          datesWithGroupedHolidays.add(dateKey);
          finalEvents.push({
            title: `${holidays.length} holidays/events`,
            start: day,
            end: dayEnd,
            allDay: true,
            color: "#ef4444",
            extendedProps: {
              type: 'holiday',
              holidays: holidays.map(e => ({ 
                title: e.title, 
                type: e.extendedProps?.type || 'holiday',
                description: e.extendedProps?.description 
              })),
              count: holidays.length,
              grouped: true
            }
          });
          holidays.forEach(e => {
            const eId = `${getDateKey(new Date(e.start))}-${e.title}`;
            processedEventIds.add(eId);
          });
        }
      } else if (holidays.length === 1) {
        if (!datesWithGroupedHolidays.has(dateKey)) {
          const eventId = `${getDateKey(new Date(holidays[0].start))}-${holidays[0].title}`;
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId);
            finalEvents.push(holidays[0]);
          }
        }
      }
      
      // Group MY OFF-SITES separately - if more than one of my off-sites on this day, group them
      if (myOffsites.length > 1) {
        const eventId = `grouped-my-offsite-${dateKey}`;
        if (!processedEventIds.has(eventId)) {
          processedEventIds.add(eventId);
          datesWithGroupedOffsites.add(dateKey); // Mark this date as having grouped off-sites
          
          // Collect all unique my off-sites from this day
          const allMyOffsites = myOffsites.map(e => ({
            title: e.title,
            user: e.extendedProps?.user || e.extendedProps?.originalOffSite?.user,
            originalOffSite: e.extendedProps?.originalOffSite
          }));
          
          finalEvents.push({
            title: `${myOffsites.length} of my off-site entries`,
            start: day,
            end: dayEnd,
            allDay: true,
            color: "#f97316", // Orange for my off-sites
            extendedProps: {
              type: 'offsite',
              offSiteType: 'my-offsite',
              offsites: allMyOffsites,
              count: myOffsites.length,
              grouped: true,
              isMyOffSite: true
            }
          });
          // Mark ALL individual my off-sites for this day as processed
          myOffsites.forEach(e => {
            const eId = `${getDateKey(new Date(e.start))}-${e.title}`;
            processedEventIds.add(eId);
            const dateId = `${getDateKey(new Date(e.start))}-my-offsite-${e.title}`;
            processedEventIds.add(dateId);
          });
        }
      } else if (myOffsites.length === 1) {
        // Single my off-site - show individually (only if not part of a grouped day)
        if (!datesWithGroupedOffsites.has(dateKey)) {
          const eventId = `${getDateKey(new Date(myOffsites[0].start))}-${myOffsites[0].title}`;
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId);
            finalEvents.push(myOffsites[0]);
          }
        }
      }
      
      // Group TEAM OFF-SITES separately - if more than one team off-site on this day, group them
      if (teamOffsites.length > 1) {
        const eventId = `grouped-team-offsite-${dateKey}`;
        if (!processedEventIds.has(eventId)) {
          processedEventIds.add(eventId);
          datesWithGroupedOffsites.add(dateKey); // Mark this date as having grouped off-sites
          
          // Collect all unique team off-sites from this day
          const allTeamOffsites = teamOffsites.map(e => {
            const originalOffSite = e.extendedProps?.originalOffSite || {};
            const user = e.extendedProps?.user || originalOffSite.user || {};
            // Ensure we have user info - if user object exists but name is missing, try to preserve the object
            return {
              title: e.title || originalOffSite.title,
              user: user && (user.name || user.email || user.id) ? user : originalOffSite.user || {},
              originalOffSite: originalOffSite
            };
          });
          
          finalEvents.push({
            title: `${teamOffsites.length} team off-site entries`,
            start: day,
            end: dayEnd,
            allDay: true,
            color: "#e91e63", // Dark Pink for team off-sites
            extendedProps: {
              type: 'offsite',
              offSiteType: 'team-offsite',
              offsites: allTeamOffsites,
              count: teamOffsites.length,
              grouped: true,
              isMyOffSite: false
            }
          });
          // Mark ALL individual team off-sites for this day as processed
          teamOffsites.forEach(e => {
            const eId = `${getDateKey(new Date(e.start))}-${e.title}`;
            processedEventIds.add(eId);
            const dateId = `${getDateKey(new Date(e.start))}-team-offsite-${e.title}`;
            processedEventIds.add(dateId);
          });
        }
      } else if (teamOffsites.length === 1) {
        // Single team off-site - show individually (only if not part of a grouped day)
        if (!datesWithGroupedOffsites.has(dateKey)) {
          const eventId = `${getDateKey(new Date(teamOffsites[0].start))}-${teamOffsites[0].title}`;
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId);
            finalEvents.push(teamOffsites[0]);
          }
        }
      }
      
      // Group BIRTHDAYS - if multiple birthdays on same day, they're already grouped in allEvents
      // Just add the grouped or single birthday event
      if (birthdays.length > 0) {
        // Birthdays are already grouped when created, so we just need to add them
        birthdays.forEach(birthday => {
          const eventId = `${getDateKey(new Date(birthday.start))}-${birthday.title}`;
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId);
            finalEvents.push(birthday);
          }
        });
      }
      
      // Add WORK ANNIVERSARIES - similar handling as birthdays
      if (anniversaries.length > 0) {
        anniversaries.forEach(anniv => {
          const eventId = `${getDateKey(new Date(anniv.start))}-${anniv.title}`;
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId);
            finalEvents.push(anniv);
          }
        });
      }
      
      // Add other events (non-birthday, non-leave, non-holiday, non-offsite)
      otherEvents.forEach(event => {
        const eventId = `${getDateKey(new Date(event.start))}-${event.title}`;
        if (!processedEventIds.has(eventId)) {
          processedEventIds.add(eventId);
          finalEvents.push(event);
        }
      });
      
      processedDates.add(dateKey);
    });

    // Multi-day events are now broken down into day-wise events above
    // So we don't need to add them back as spanning events
    // All events (leaves, off-sites, holidays) are now day-wise and handled by grouping logic

    return finalEvents;
  };

  // Create calendar events with grouping for Admin/HR users
  const createCalendarEvents = () => {
    const allEvents: any[] = [];
    const groupedEventsByDate = new Map<string, any[]>();
    
    // Process holidays with robust multi-day parsing
    const holidays = dashboardData?.data?.upcoming_holidays || [];
    
    holidays
      .filter((h: any) => {
        // Include if isCalendarEvent is true, undefined, or null (default to true)
        const isCalendarEvent = h.isCalendarEvent !== false;
        return isCalendarEvent;
      })
      .forEach((h: any) => {
        const range = h.date_range || h.dateRange;
        let event: any = null;
        
        // Try to parse multi-day event first
        if (range && String(range).trim() !== '') {
          // Multi-day event (FullCalendar treats all-day 'end' as exclusive)
          // Support both "YYYY-MM-DD to YYYY-MM-DD" and "YYYY-MM-DD - YYYY-MM-DD" formats
          const rangeStr = String(range).trim();
          let parts: string[] = [];
          
          if (rangeStr.includes(" to ")) {
            parts = rangeStr.split(" to ");
          } else if (rangeStr.includes(" - ")) {
            parts = rangeStr.split(" - ");
          }
          
          if (parts.length >= 2) {
            try {
              const startStr = parts[0].trim();
              const endStr = parts[1].trim();
              const startDate = new Date(startStr);
              const endInclusive = new Date(endStr);
              
              // Validate dates
              if (!isNaN(startDate.getTime()) && !isNaN(endInclusive.getTime())) {
                const endExclusive = new Date(endInclusive);
                endExclusive.setDate(endExclusive.getDate() + 1); // make inclusive visible
                event = {
                  title: h.name || h.title,
                  start: startDate,
                  end: endExclusive,
                  allDay: true,
                  color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#ec4899" : h.type === 'notice' ? "#39ff14" : "#10b981"),
                  extendedProps: {
                    type: h.type || 'holiday',
                    description: h.description,
                    originalHoliday: h
                  }
                };              }
            } catch (e) {
              // Error parsing date range for holiday
            }
          }
        }
        
        // Try single date if no range or range parsing failed
        if (!event && h.date) {
          try {
            const dateStr = typeof h.date === 'string' ? h.date : (h.date instanceof Date ? h.date.toISOString().split('T')[0] : String(h.date));
            const holidayDate = new Date(dateStr);
            
            if (!isNaN(holidayDate.getTime())) {
              event = {
                title: h.name || h.title,
                start: holidayDate,
                end: new Date(holidayDate.getTime() + 24*60*60*1000), // exclusive end for single all-day
                allDay: true,
                color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#ec4899" : h.type === 'notice' ? "#8b5cf6" : "#10b981"),
                extendedProps: {
                  type: h.type || 'holiday',
                  description: h.description,
                  originalHoliday: h
                }
              };            }
          } catch (e) {
            // Error parsing date for holiday
          }
        }
        
        // Holiday couldn't be processed (no event created)
        
        if (event) {
          // Break down multi-day holidays into day-wise events (similar to leaves)
          // This allows proper grouping when multiple holidays occur on the same day
          const start = new Date(event.start);
          const end = event.end ? new Date(event.end) : start;
          const isMultiDay = Math.abs(end.getTime() - start.getTime()) > 24 * 60 * 60 * 1000;
          
          if (isMultiDay) {
            // Break down into day-wise events
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
              const dayKey = getDateKey(d);
              const dayEnd = new Date(d);
              dayEnd.setDate(dayEnd.getDate() + 1);
              
              // Create a day-wise event for this specific day
              const dayEvent = {
                title: event.title,
                start: new Date(d),
                end: dayEnd,
                allDay: true,
                color: event.color,
                extendedProps: {
                  type: event.extendedProps.type,
                  description: event.extendedProps.description,
                  originalHoliday: event.extendedProps.originalHoliday
                }
              };
              
              allEvents.push(dayEvent);
              
              // Add to grouped map for this specific day
              if (!groupedEventsByDate.has(dayKey)) {
                groupedEventsByDate.set(dayKey, []);
              }
              groupedEventsByDate.get(dayKey)!.push(dayEvent);
            }
          } else {
            // Single-day holiday - add as is
            allEvents.push(event);
            
            // Add to grouped map for this day
            const dateKey = getDateKey(start);
            if (!groupedEventsByDate.has(dateKey)) {
              groupedEventsByDate.set(dateKey, []);
            }
            groupedEventsByDate.get(dateKey)!.push(event);
          }
        }
      });

    // Add off-site entries - break down into day-wise events
    // Separate "My Off-site" from "Team Off-site" with different colors
    // Backend already filters: HR/Admin/God see all organization off-sites, employees see only their own
    const offSites = dashboardData?.data?.recent_off_sites || [];
    offSites
      .filter((o: any) => o.start_date && o.end_date) // Only filter out invalid entries (missing dates)
      .forEach((o: any) => {
        const start = new Date(o.start_date);
        const endInclusive = new Date(o.end_date);
        const endExclusive = new Date(endInclusive);
        endExclusive.setDate(endExclusive.getDate() + 1);
        
        // Check if this is the current user's off-site or a team member's
        const isMyOffSite = String(o.user_id || o.user?.id) === String(userId);
        const offSiteType = isMyOffSite ? 'my-offsite' : 'team-offsite';
        const color = isMyOffSite ? "#f97316" : "#e91e63"; // Orange for my off-site, Dark Pink for team off-site
        const title = isMyOffSite 
          ? `My Off-site: ${o.title}`
          : `${o.user?.name || 'Employee'}: ${o.title}`;
        
        // Break down into day-wise events (one per day) instead of a single spanning event
        for (let d = new Date(start); d < endExclusive; d.setDate(d.getDate() + 1)) {
          const dayKey = getDateKey(d);
          const dayEnd = new Date(d);
          dayEnd.setDate(dayEnd.getDate() + 1);
          
          // Create a day-wise event for this specific day
          const dayEvent = {
            title,
            start: new Date(d),
            end: dayEnd,
            allDay: true,
            color,
            extendedProps: {
              type: 'offsite',
              offSiteType, // 'my-offsite' or 'team-offsite'
              originalOffSite: o,
              user: o.user,
              isMyOffSite
            }
          };
          
          allEvents.push(dayEvent);
          
          // Add to grouped map for this specific day
          if (!groupedEventsByDate.has(dayKey)) {
            groupedEventsByDate.set(dayKey, []);
          }
          groupedEventsByDate.get(dayKey)!.push(dayEvent);
        }
      });

    // Add birthdays - group multiple birthdays on the same day
    const currentYear = new Date().getFullYear();
    const birthdaysByDate = new Map<string, any[]>();
    
    (dashboardData?.data?.user_birthdays || [])
      .filter((b: any) => b.birthday_visible)
      .forEach((b: any) => {
        const birthdayDate = new Date(b.birthday);

        // Show birthdays for current year and next 5 years
        for (let yearOffset = 0; yearOffset < 6; yearOffset++) {
          const birthdayThisYear = new Date(currentYear + yearOffset, birthdayDate.getMonth(), birthdayDate.getDate());

          // Only show if the birthday hasn't passed in the current year (for current year only)
          if (yearOffset === 0 && birthdayThisYear < new Date()) {
            continue; // Skip past birthdays in current year
          }

          const dateKey = getDateKey(birthdayThisYear);
          if (!birthdaysByDate.has(dateKey)) {
            birthdaysByDate.set(dateKey, []);
          }
          birthdaysByDate.get(dateKey)!.push({
            name: b.name,
            birthday: b.birthday,
            date: birthdayThisYear
          });
        }
      });

    // Create grouped birthday events
    birthdaysByDate.forEach((birthdays, dateKey) => {
      const date = new Date(dateKey);
      const endExclusive = new Date(date);
      endExclusive.setDate(endExclusive.getDate() + 1);

      if (birthdays.length > 1) {
        // Multiple birthdays on the same day - group them
        const event = {
          title: `🎂 ${birthdays.length} birthdays`,
          start: date,
          end: endExclusive,
          allDay: true,
          color: "#06b6d4", // Cyan color for birthdays
          extendedProps: {
            type: 'birthday',
            birthdays: birthdays.map(b => ({
              name: b.name,
              birthday: b.birthday,
              description: `${b.name}'s birthday`
            })),
            count: birthdays.length,
            grouped: true
          }
        };
        allEvents.push(event);
      } else {
        // Single birthday - show individually
        const b = birthdays[0];
        const event = {
          title: `🎂 ${b.name}'s Birthday`,
          start: date,
          end: endExclusive,
          allDay: true,
          color: "#06b6d4", // Cyan color for birthdays
          extendedProps: {
            type: 'birthday',
            birthdays: [{
              name: b.name,
              birthday: b.birthday,
              description: `${b.name}'s birthday`
            }],
            count: 1
          }
        };
        allEvents.push(event);
      }

      // Add to grouped events map for daywise grouping
      if (!groupedEventsByDate.has(dateKey)) {
        groupedEventsByDate.set(dateKey, []);
      }
      groupedEventsByDate.get(dateKey)!.push(allEvents[allEvents.length - 1]);
    });
    
    // Add work anniversaries - group multiple anniversaries on the same day
    const anniversariesByDate = new Map<string, any[]>();
    const anniversarySeenByDate = new Map<string, Set<string>>();
    const workAnniversaries = (dashboardData?.data?.work_anniversaries || []) as any[];
    // Role-based filter: Employees see only their own anniversaries
    const filteredAnniversaries = (userRole === "HR" || userRole === "Admin" || userRole === "God")
      ? workAnniversaries
      : workAnniversaries.filter((a: any) => String(a.id) === String(userId));
    
    filteredAnniversaries.forEach((a: any) => {
      const joiningDate = new Date(a.joining_date);
      // Show anniversaries for current year and next 5 years
      for (let yearOffset = 0; yearOffset < 6; yearOffset++) {
        const annivThisYear = new Date(currentYear + yearOffset, joiningDate.getMonth(), joiningDate.getDate());
        // Skip past anniversaries in current year
        if (yearOffset === 0 && annivThisYear < new Date()) continue;
        const dateKey = getDateKey(annivThisYear);
        if (!anniversariesByDate.has(dateKey)) anniversariesByDate.set(dateKey, []);
        if (!anniversarySeenByDate.has(dateKey)) anniversarySeenByDate.set(dateKey, new Set());
        // Compute years completed on that anniversary year
        const years = (currentYear + yearOffset) - joiningDate.getFullYear();
        const uid = String(a.id);
        const seen = anniversarySeenByDate.get(dateKey)!;
        if (!seen.has(uid)) {
          seen.add(uid);
          anniversariesByDate.get(dateKey)!.push({
            id: uid,
            name: a.name,
            joining_date: a.joining_date,
            years,
            date: annivThisYear
          });
        }
      }
    });
    
    // Create grouped anniversary events
    anniversariesByDate.forEach((annivs, dateKey) => {
      const date = new Date(dateKey);
      const endExclusive = new Date(date);
      endExclusive.setDate(endExclusive.getDate() + 1);
      if (annivs.length > 1) {
        const event = {
          title: `🎉 ${annivs.length} work anniversaries`,
          start: date,
          end: endExclusive,
          allDay: true,
          color: "#f59e0b", // Amber for anniversaries
          extendedProps: {
            type: 'anniversary',
            anniversaries: annivs.map(a => ({
              id: a.id,
              name: a.name,
              years: a.years,
              description: `${a.name} — ${a.years} year(s)`
            })),
            count: annivs.length,
            grouped: true
          }
        };
        allEvents.push(event);
      } else {
        const a = annivs[0];
        const event = {
          title: `🎉 ${a.name}'s Work Anniversary`,
          start: date,
          end: endExclusive,
          allDay: true,
          color: "#f59e0b",
          extendedProps: {
            type: 'anniversary',
            anniversaries: [{
              id: a.id,
              name: a.name,
              years: a.years,
              description: `${a.name} — ${a.years} year(s)`
            }],
            count: 1
          }
        };
        allEvents.push(event);
      }
      if (!groupedEventsByDate.has(dateKey)) groupedEventsByDate.set(dateKey, []);
      groupedEventsByDate.get(dateKey)!.push(allEvents[allEvents.length - 1]);
    });

    // Process leaves
    // Backend already filters: HR/Admin/God get all organization leaves, employees get only their own
    const leaves = (dashboardData?.data?.recent_leaves || []).filter((leave: any) => leave.status === 'approved');
    // Frontend double-check: ensure HR/Admin/God see all, employees see only their own
    const leavesToProcess = userRole === "HR" || userRole === "Admin" || userRole === "God" 
      ? leaves  // HR/Admin/God: use all leaves from backend (already filtered to org-wide)
      : leaves.filter((l: any) => String(l.user_id) === String(userId)); // Employees: only their own
    
    // Create unique leave events
    const leaveMap = new Map<string, any>();
    leavesToProcess.forEach((leave: any) => {
      const key = `${leave.user_id}-${leave.from_date || leave.from}-${leave.to_date || leave.to}`;
      if (!leaveMap.has(key)) {
        leaveMap.set(key, leave);
      }
    });
    
    // Break down multi-day leaves into day-wise events for proper grouping
    leaveMap.forEach((leave: any) => {
      const isCurrentUser = String(leave.user_id) === String(userId);
      const title = userRole === "HR" || userRole === "Admin" || userRole === "God"
        ? `${leave.user?.name || 'Employee'} - ${leave.type}`
        : leave.type;
      const employees = [{
        name: leave.user?.name || 'Employee',
        type: leave.type,
        status: leave.status,
        reason: leave.reason
      }];
      
      // Get the date range for this leave
      const startDate = new Date(leave.from_date || leave.from);
      const endDate = new Date(leave.to_date || leave.to);
      const endExclusive = new Date(endDate);
      endExclusive.setDate(endExclusive.getDate() + 1); // Exclusive end for calendar
      
      // Break down into day-wise events (one per day) instead of a single spanning event
      for (let d = new Date(startDate); d < endExclusive; d.setDate(d.getDate() + 1)) {
        const dayKey = getDateKey(d);
        const dayEnd = new Date(d);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        // Create a day-wise event for this specific day
        const dayEvent = {
          title,
          start: new Date(d),
          end: dayEnd,
          allDay: true,
          color: isCurrentUser ? "#10b981" : "#6366f1",
          extendedProps: {
            type: 'leave',
            employees,
            count: 1,
            isCurrentUser,
            hasCurrentUser: isCurrentUser,
            originalLeave: leave // Store original leave for reference
          }
        };
        
        allEvents.push(dayEvent);
        
        // Add to grouped map for this specific day
        if (!groupedEventsByDate.has(dayKey)) {
          groupedEventsByDate.set(dayKey, []);
        }
        groupedEventsByDate.get(dayKey)!.push(dayEvent);
      }
    });

    // Create daywise grouped events
    return createDaywiseGroupedEvents(allEvents, groupedEventsByDate);
  };

  return (
    <main className="space-y-8" role="main" aria-label="Dashboard overview">
      {/* AI-Friendly Page Structure */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "HR Portal Dashboard",
            "description": "Overview of HR metrics, employee activities, and organizational data",
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "isPartOf": {
              "@type": "WebSite",
              "name": "HR Portal"
            },
            "about": {
              "@type": "Organization",
              "name": "HR Management System"
            },
            "mainEntity": {
              "@type": "ItemList",
              "name": "Dashboard Metrics",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "name": "Leave Balances",
                  "description": "Current leave balances for all employees"
                },
                {
                  "@type": "ListItem", 
                  "name": "Upcoming Events",
                  "description": "Holidays, notices, and important dates"
                },
                {
                  "@type": "ListItem",
                  "name": "Recent Activities",
                  "description": "Recent leaves, documents, and off-site entries"
                },
                {
                  "@type": "ListItem",
                  "name": "Calendar View",
                  "description": "Monthly calendar with events and activities"
                }
              ]
            }
          })
        }}
      />

      <header>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">
          Overview of HR metrics, employee activities, and organizational data
        </p>
      </header>


      {/* Leave Balances */}
      <section aria-labelledby="leave-balances-heading">
        <h2 id="leave-balances-heading" className="sr-only">Leave Balances</h2>
        <LeaveBalanceCard balance={dashboardData?.data?.leave_balances || []} />
      </section>

      {/* Events & Notices */}
      <section aria-labelledby="events-notices-heading">
        <h2 id="events-notices-heading" className="sr-only">Upcoming Events & Notices</h2>
        <Card title="Upcoming Events & Notices">
        <div className="space-y-3">
          {(() => {
            const holidays = dashboardData?.data?.upcoming_holidays || [];
            const hikeReminders = dashboardData?.data?.hike_reminders || [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Process and filter events
            const processedEvents = holidays
              .filter((h: any) => {
                // Check for notices without dates
                if (!h.date && !h.date_range && !h.dateRange && h.type === 'notice') return true;
                
                // Check single-day events
                if (h.date) {
                  const eventDate = new Date(h.date);
                  eventDate.setHours(0, 0, 0, 0);
                  return eventDate >= today;
                }
                
                // Check multi-day events (handle both camelCase and snake_case)
                const dateRange = h.date_range || h.dateRange;
                if (dateRange) {
                  const parts = dateRange.split(' to ');
                  if (parts.length === 2) {
                    const endDate = new Date(parts[1].trim());
                    endDate.setHours(0, 0, 0, 0);
                    // Include if the event ends today or later
                    return endDate >= today;
                  }
                }
                
                return false;
              })
              // Deduplicate by ID (in case backend returns duplicates)
              .reduce((acc: any[], event: any) => {
                if (!acc.find((e: any) => e.id === event.id)) {
                  acc.push(event);
                }
                return acc;
              }, [])
              .sort((a: any, b: any) => {
                // Notices without dates go first, then sort by start date
                const getStartDate = (event: any) => {
                  if (event.date) return new Date(event.date);
                  const dateRange = event.date_range || event.dateRange;
                  if (dateRange) {
                    const parts = dateRange.split(' to ');
                    if (parts.length === 2) {
                      return new Date(parts[0].trim());
                    }
                  }
                  return new Date(0); // Put no-date events at the end
                };

                const dateA = getStartDate(a);
                const dateB = getStartDate(b);
                
                if (dateA.getTime() === 0 && dateB.getTime() === 0) return 0;
                if (dateA.getTime() === 0) return 1;
                if (dateB.getTime() === 0) return -1;
                
                return dateA.getTime() - dateB.getTime();
              });

            // Add hike reminders to events
            const hikeEvents = hikeReminders.map((reminder: any) => ({
              id: `hike-${reminder.user_id}`,
              type: 'hike',
              name: `Hike Reminder: ${reminder.user_name}`,
              date: reminder.next_hike_date,
              description: `Employee ID: ${reminder.employee_id} | Cycle: ${reminder.hike_cycle_months} months`,
              reminder: reminder,
            }));

            const allEvents = [...processedEvents, ...hikeEvents].sort((a: any, b: any) => {
              const dateA = a.date ? new Date(a.date) : new Date(0);
              const dateB = b.date ? new Date(b.date) : new Date(0);
              if (dateA.getTime() === 0 && dateB.getTime() === 0) return 0;
              if (dateA.getTime() === 0) return 1;
              if (dateB.getTime() === 0) return -1;
              return dateA.getTime() - dateB.getTime();
            }).slice(0, 5); // Show top 5 events including hike reminders

            return allEvents.length > 0 ? (
              allEvents.map((event: any) => {
                const dateRange = event.date_range || event.dateRange;
                const isMultiDay = !!dateRange && dateRange.includes(' to ');

                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-lg">
                      {event.type === 'hike' ? "💰" : event.type === 'event' ? "📅" : event.type === 'notice' ? "📢" : "🎊"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-primary">{event.name || event.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border
                          ${
                            event.type === 'hike'
                              ? 'text-emerald-700 border-emerald-500 dark:text-emerald-300 dark:border-emerald-500/40'
                              : event.type === 'holiday'
                              ? 'text-red-700 border-red-500 dark:text-red-300 dark:border-red-500/40'
                              : event.type === 'event'
                              ? 'text-amber-700 border-amber-500 dark:text-amber-300 dark:border-amber-500/40'
                              : event.type === 'notice'
                              ? 'text-green-700 border-green-500 dark:text-green-300 dark:border-green-500/40'
                              : 'text-purple-700 border-purple-500 dark:text-purple-300 dark:border-purple-500/40'
                          }
                        }`}>
                          {event.type === 'hike' ? 'hike reminder' : event.type || 'holiday'}
                        </span>
                      </div>
                      {isMultiDay ? (
                        <p className="text-sm text-secondary truncate">
                          {(() => {
                            const parts = dateRange.split(' to ');
                            if (parts.length === 2) {
                              const startDate = new Date(parts[0].trim());
                              const endDate = new Date(parts[1].trim());
                              return `${startDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })} - ${endDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
                              })}`;
                            }
                            return dateRange;
                          })()}
                        </p>
                      ) : event.date ? (
                        <p className="text-sm text-secondary truncate">
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      ) : (
                        <p className="text-sm text-secondary truncate">📢 Ongoing Notice</p>
                      )}
                      {event.description && (
                        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 py-4">
                No upcoming events or notices
              </div>
            );
          })()}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link href="/holidays" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all events & notices →
          </Link>
        </div>
      </Card>
      </section>

      <div className="space-y-6">
        {/* Calendar or List (responsive) */}
        <section aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className="sr-only">Calendar View</h2>
          <Card title="Upcoming Leaves & Holidays">
      <div className="hidden sm:block">
        <Calendar events={createCalendarEvents()} userRole={userRole} />
      </div>
          <div className="sm:hidden space-y-3">
            {createCalendarEvents()
              // include ongoing multi-day events (end is exclusive)
              .filter((e) => new Date(e.end) > new Date(new Date().toDateString()))
              // sort by start date ascending to surface nearest events
              .sort((a: any, b: any) => {
                const aStart = a.start instanceof Date ? a.start : new Date(a.start);
                const bStart = b.start instanceof Date ? b.start : new Date(b.start);
                return aStart.getTime() - bStart.getTime();
              })
              .slice(0, 3)
              .map((e, index) => (
                <div key={`mobile-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className={`w-2 h-8 rounded`} style={{ backgroundColor: e.color }} />
                  <div>
                    <div className="text-sm text-gray-300">{e.title}</div>
                    {/* Type label and details */}
                    {e.extendedProps?.type && (
                      <div className="text-[11px] text-gray-400 mt-0.5 capitalize">
                        {e.extendedProps.type === 'anniversary' ? (
                          <span className="text-amber-400">
                            {e.extendedProps?.anniversaries?.length > 1
                              ? `${e.extendedProps.anniversaries.length} work anniversaries`
                              : e.extendedProps?.anniversaries?.[0]
                                ? `${e.extendedProps.anniversaries[0].name} — ${e.extendedProps.anniversaries[0].years} year${e.extendedProps.anniversaries[0].years === 1 ? '' : 's'}`
                                : 'Work Anniversary'}
                          </span>
                        ) : e.extendedProps.type}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {e.start instanceof Date
                        ? e.start.toLocaleDateString()
                        : new Date(e.start).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
        </section>

        {/* Recent Documents - compact */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Recent Documents</h3>
            <button
              onClick={() => window.location.href = '/documents'}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <ul className="divide-y divide-gray-700 text-sm">
              {(dashboardData?.data?.recent_documents || [])
                .filter((doc: any) => {
                  // Filter out private documents for non-HR/Admin users
                  if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
                    return true; // HR/Admin can see all documents
                  }
                  // Backend returns is_public (snake_case) in JSON, check both formats for compatibility
                  const isPublic = doc.is_public !== undefined ? doc.is_public : (doc.isPublic !== undefined ? doc.isPublic : false);
                  const docUserId = doc.user_id !== undefined ? String(doc.user_id) : String(doc.userId || doc.user?.id || "");
                  return isPublic || docUserId === String(userId); // Employees can only see public docs or their own
                })
                .slice(0, 3).map((doc: any) => (
              <li key={doc.id} className="py-2 flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="truncate block font-medium">{doc.title}</span>
                    <span className="text-xs text-gray-400">{doc.category}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/documents/${doc.id}/download`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          'X-Organization-ID': localStorage.getItem('organizationId') || '',
                        },
                      });
                      const data = await response.json();
                      if (data.fileUrl) {
                        if (data.fileUrl.toLowerCase().endsWith('.pdf')) {
                          // Open PDF in custom viewer
                          const encodedUrl = encodeURIComponent(data.fileUrl);
                          const encodedTitle = encodeURIComponent(doc.title);
                          window.open(`/pdf?url=${encodedUrl}&title=${encodedTitle}`, '_blank');
                        } else {
                          window.open(data.fileUrl, '_blank');
                        }
                      }
                    } catch (error) {
                      // Failed to download document
                    }
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  {doc.fileUrl?.toLowerCase().endsWith('.pdf') ? 'View PDF' : 'View'}
                </button>
              </li>
            ))}
          {(dashboardData?.data?.recent_documents || []).length === 0 && (
            <li className="text-gray-400 py-4 text-center">
              {userRole === "HR" || userRole === "Admin" || userRole === "God" 
                ? "No documents available" 
                : "No public documents or documents assigned to you"}
            </li>
          )}
        </ul>
      </Card>

        {/* Recent Salary Slips - compact */}
        <Card title="Recent Salary Slips" className="p-4">
          <ul className="divide-y divide-gray-700 text-sm">
            {(dashboardData?.data?.recent_salary_slips || []).slice(0, 3).map((slip: any) => (
              <li key={slip.id} className="py-2 flex justify-between items-center">
                <span className="truncate pr-3">
                  {new Date(slip.year, slip.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/${slip.id}/download`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          'X-Organization-ID': localStorage.getItem('organizationId') || '',
                        },
                      });
                      const data = await response.json();
                      if (data.fileUrl) {
                        window.open(data.fileUrl, '_blank');
                      }
                    } catch (error) {
                      // Failed to download salary slip
                    }
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  View
                </button>
              </li>
            ))}
            {((dashboardData?.data?.recent_salary_slips || []).length || 0) === 0 && (
              <li className="text-gray-400">No salary slips</li>
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}
