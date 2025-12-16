import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Search, Filter, Globe, Video, Plus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EventCard from '@/components/events/EventCard';
import AfricanPattern from '@/components/shared/AfricanPattern';

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'cultural_festival', label: 'Cultural Festivals' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'speed_dating', label: 'Speed Dating' },
  { value: 'networking', label: 'Networking' },
  { value: 'concert', label: 'Concerts' },
  { value: 'food_festival', label: 'Food Festivals' },
];

export default function Events() {
  const [myProfile, setMyProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'virtual', 'local'
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchMyProfile();
  }, []);

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', selectedType, viewMode],
    queryFn: async () => {
      let filterQuery = {};
      
      if (selectedType !== 'all') {
        filterQuery.event_type = selectedType;
      }
      
      if (viewMode === 'virtual') {
        filterQuery.is_virtual = true;
      }
      
      const allEvents = await base44.entities.Event.filter(filterQuery, 'start_date', 50);
      
      // Filter future events only
      const now = new Date();
      return allEvents.filter(e => new Date(e.start_date) >= now);
    }
  });

  // Join event mutation
  const joinEventMutation = useMutation({
    mutationFn: async (event) => {
      if (!myProfile) return;
      const attendees = event.attendees || [];
      if (!attendees.includes(myProfile.id)) {
        await base44.entities.Event.update(event.id, {
          attendees: [...attendees, myProfile.id]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
    }
  });

  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.city?.toLowerCase().includes(query) ||
      event.country?.toLowerCase().includes(query)
    );
  });

  const featuredEvents = filteredEvents.filter(e => e.is_featured);
  const upcomingEvents = filteredEvents.filter(e => !e.is_featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative">
      <AfricanPattern className="text-amber-600" opacity={0.03} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-amber-600 bg-clip-text text-transparent">
                Events
              </h1>
              <Badge variant="outline" className="gap-1">
                <Calendar size={14} />
                {events.length} upcoming
              </Badge>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, cities..."
                  className="pl-10 bg-white"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[160px] bg-white">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Tabs value={viewMode} onValueChange={setViewMode}>
                  <TabsList className="bg-gray-100">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                    <TabsTrigger value="local" className="gap-1 text-xs sm:text-sm">
                      <MapPin size={14} />
                      <span className="hidden sm:inline">Local</span>
                    </TabsTrigger>
                    <TabsTrigger value="virtual" className="gap-1 text-xs sm:text-sm">
                      <Video size={14} />
                      <span className="hidden sm:inline">Virtual</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-96 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-2xl" />
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Featured Events */}
            {featuredEvents.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  Featured Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredEvents.map(event => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <EventCard
                        event={event}
                        onJoin={joinEventMutation.mutate}
                        isAttending={event.attendees?.includes(myProfile?.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* All Events */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {selectedType === 'all' ? 'All Events' : EVENT_TYPES.find(t => t.value === selectedType)?.label}
              </h2>
              
              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {upcomingEvents.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <EventCard
                          event={event}
                          onJoin={joinEventMutation.mutate}
                          isAttending={event.attendees?.includes(myProfile?.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 bg-white rounded-2xl"
                >
                  <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No events found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try a different search term' : 'Check back later for new events'}
                  </p>
                </motion.div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}