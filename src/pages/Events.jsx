import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, MapPin, Users, Globe, Filter, Search, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

export default function Events() {
  const [myProfile, setMyProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventType, setEventType] = useState('all');
  const [location, setLocation] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfile();
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', eventType, location, timeFilter],
    queryFn: async () => {
      let query = {};
      
      if (eventType !== 'all') {
        query.event_type = eventType;
      }
      
      if (location !== 'all' && myProfile) {
        query.country = myProfile.current_country;
      }

      const allEvents = await base44.entities.Event.filter(query, '-start_date', 100);
      
      const now = new Date();
      return allEvents.filter(event => {
        const eventDate = new Date(event.start_date);
        if (timeFilter === 'upcoming') {
          return eventDate >= now;
        } else if (timeFilter === 'past') {
          return eventDate < now;
        }
        return true;
      });
    },
    enabled: !!myProfile
  });

  const joinEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const updatedAttendees = [...(event.attendees || []), myProfile.id];
      await base44.entities.Event.update(eventId, {
        attendees: updatedAttendees
      });

      await base44.entities.Notification.create({
        user_profile_id: myProfile.id,
        type: 'admin_message',
        title: 'Event Registered!',
        message: `You're registered for ${event.title}`,
        link_to: createPageUrl('Events')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
    }
  });

  const filteredEvents = events.filter(event => {
    if (searchQuery) {
      return event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 pb-24">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Community Events</h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Tabs value={timeFilter} onValueChange={setTimeFilter}>
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cultural_festival">Cultural Festival</SelectItem>
                <SelectItem value="meetup">Meetup</SelectItem>
                <SelectItem value="speed_dating">Speed Dating</SelectItem>
                <SelectItem value="networking">Networking</SelectItem>
                <SelectItem value="concert">Concert</SelectItem>
                <SelectItem value="food_festival">Food Festival</SelectItem>
              </SelectContent>
            </Select>

            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="local">Near Me</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No events found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => {
              const isAttending = event.attendees?.includes(myProfile?.id);
              const isFull = event.max_attendees && event.attendees?.length >= event.max_attendees;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-700">
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                        {event.is_featured && (
                          <Badge className="bg-amber-500">Featured</Badge>
                        )}
                      </div>
                      <CardTitle>{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          <span>{format(new Date(event.start_date), 'PPp')}</span>
                        </div>
                        
                        {event.is_virtual ? (
                          <div className="flex items-center gap-2">
                            <Globe size={16} className="text-gray-400" />
                            <span>Virtual Event</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="line-clamp-1">
                              {event.location_name}, {event.city}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          <span>
                            {event.attendees?.length || 0}
                            {event.max_attendees && ` / ${event.max_attendees}`} attending
                          </span>
                        </div>
                      </div>

                      {event.price > 0 && (
                        <p className="text-lg font-bold text-purple-600 mb-4">
                          ${event.price} {event.currency}
                        </p>
                      )}

                      <Button
                        onClick={() => joinEventMutation.mutate(event.id)}
                        disabled={isAttending || isFull || joinEventMutation.isPending}
                        className={`w-full ${
                          isAttending
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {isAttending ? '✓ Attending' : isFull ? 'Event Full' : 'Join Event'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}