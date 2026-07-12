import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Plus, Calendar, Users, Ticket, ChevronRight, X, Loader2 } from 'lucide-react';

// Define the shape of the data coming from our C# API
interface EventItem {
  id: string;
  name: string;
  totalCapacity: number;
  totalGenerated: number;
  totalCheckedIn: number;
}

export default function EventsListScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventCapacity, setNewEventCapacity] = useState('');
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  // Fetch events when the screen loads
  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle creating a new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/events', { 
        name: newEventName, 
        totalCapacity: parseInt(newEventCapacity) || 0 
      });
      
      // Reset form and close modal
      setNewEventName('');
      setNewEventCapacity('');
      setIsModalOpen(false);
      
      // Refresh the list to show the new event
      await fetchEvents();
    } catch (error) {
      console.error("Failed to create event:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Active Nodes</h2>
          <p className="text-gray-400 text-sm tracking-wider uppercase mt-1">Select an event to manage access</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emberz-cyan text-black font-bold py-2.5 px-5 rounded-lg hover:bg-teal-400 transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:shadow-[0_0_25px_rgba(0,255,204,0.5)]"
        >
          <Plus size={20} />
          Initialize New Event
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="animate-spin text-emberz-cyan mb-4" size={40} />
          <p className="uppercase tracking-widest text-sm">Syncing with secure server...</p>
        </div>
      ) : events.length === 0 ? (
        /* Empty State */
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="bg-white/5 p-4 rounded-full mb-4">
            <Calendar className="text-gray-500" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Active Events</h3>
          <p className="text-gray-400 mb-6 max-w-md">There are currently no events registered in the system. Initialize a new event to begin generating secure access tokens.</p>
        </div>
      ) : (
        /* Events Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div 
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="bg-white/[0.03] border border-white/10 hover:border-emberz-cyan/50 rounded-2xl p-6 cursor-pointer group transition-all duration-300 hover:bg-white/[0.05]"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-emberz-cyan transition-colors line-clamp-2">
                  {ev.name}
                </h3>
                <ChevronRight className="text-gray-600 group-hover:text-emberz-cyan transition-colors shrink-0" />
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-400"><Users size={16}/> Capacity</span>
                  <span className="font-mono text-gray-200">{ev.totalCapacity.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-400"><Ticket size={16}/> Generated</span>
                  <span className="font-mono text-gray-200">{ev.totalGenerated.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-white/10">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Checked In</span>
                  <span className="font-mono font-bold text-emberz-cyan">{ev.totalCheckedIn.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Initialize Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider text-xs">Event Designation</label>
                <input
                  type="text"
                  required
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emberz-cyan focus:ring-1 focus:ring-emberz-cyan transition-colors"
                  placeholder="e.g. Tech Summit 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider text-xs">Expected Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newEventCapacity}
                  onChange={(e) => setNewEventCapacity(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emberz-cyan focus:ring-1 focus:ring-emberz-cyan transition-colors font-mono"
                  placeholder="e.g. 500"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors mt-4 disabled:opacity-50"
              >
                {creating ? 'Processing...' : 'Deploy Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}