import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Trophy, 
  Activity, 
  LogOut, 
  Menu, 
  X, 
  Plus, 
  Edit, 
  Trash2,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  User,
  Shield,
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  UserCog,
  BookOpen,
  Home as HomeIcon,
  ArrowLeft,
  Settings,
  Upload,
  Image,
  Key
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser();
    }
  };

  const loginWithToken = async (newToken) => {
    localStorage.setItem("token", newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
};

// Loading Screen
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="spinner" />
  </div>
);

// ==================== SHARED HEADER ====================

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const logoSize = settings?.site_logo_size || 32;
  const headerHeight = Math.max(64, logoSize + 24);

  const handleMobileNav = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black" style={{ height: `${headerHeight}px` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {settings?.site_logo ? (
                <>
                  <img 
                    src={getImageUrl(settings.site_logo)} 
                    alt="Logo" 
                    style={{ height: `${Math.min(logoSize, 40)}px`, width: 'auto' }}
                    className="object-contain sm:hidden" 
                  />
                  <img 
                    src={getImageUrl(settings.site_logo)} 
                    alt="Logo" 
                    style={{ height: `${logoSize}px`, width: 'auto' }}
                    className="object-contain hidden sm:block" 
                  />
                </>
              ) : (
                settings?.site_name && (
                  <span className="font-bold text-lg sm:text-xl text-white" style={{fontFamily: 'Manrope'}}>
                    {settings.site_name}
                  </span>
                )
              )}
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  {(user.role === "admin" || user.role === "subadmin") && (
                    <Link to="/admin">
                      <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" data-testid="admin-btn">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/my-bookings">
                    <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" data-testid="my-bookings-btn">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Foglalásaim
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" data-testid="profile-btn">
                      <User className="h-4 w-4 mr-2" />
                      Profilom
                    </Button>
                  </Link>
                  <HeaderUserMenu />
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-white hover:bg-white/10" data-testid="login-btn">Bejelentkezés</Button>
                  </Link>
                  <Link to="/register">
                    <Button className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-full px-6" data-testid="register-btn">Regisztráció</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-72 bg-white z-50 md:hidden shadow-xl" style={{ paddingTop: `${headerHeight}px` }}>
            <div className="p-4 space-y-2">
              {user ? (
                <>
                  <div className="px-4 py-3 border-b border-slate-200 mb-2">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  {(user.role === "admin" || user.role === "subadmin") && (
                    <button onClick={() => handleMobileNav('/admin')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                      <LayoutDashboard className="h-5 w-5" />
                      Admin
                    </button>
                  )}
                  <button onClick={() => handleMobileNav('/my-bookings')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <BookOpen className="h-5 w-5" />
                    Foglalásaim
                  </button>
                  <button onClick={() => handleMobileNav('/profile')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <User className="h-5 w-5" />
                    Profilom
                  </button>
                  <div className="border-t border-slate-200 mt-2 pt-2">
                    <button 
                      onClick={() => { setMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut className="h-5 w-5" />
                      Kijelentkezés
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => handleMobileNav('/login')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <User className="h-5 w-5" />
                    Bejelentkezés
                  </button>
                  <button onClick={() => handleMobileNav('/register')} className="w-full flex items-center gap-3 px-4 py-3 bg-[#2563EB] text-white hover:bg-[#1d4ed8] rounded-lg">
                    <User className="h-5 w-5" />
                    Regisztráció
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

const HeaderUserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        data-testid="user-menu-btn"
      >
        <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-medium">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-white hidden sm:block">{user?.name}</span>
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="font-medium text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <Badge className="mt-2" variant="secondary">
                {user?.role === 'admin' ? 'Admin' : user?.role === 'subadmin' ? 'Subadmin' : 'Felhasználó'}
              </Badge>
            </div>
            <div className="p-2">
              <button
                onClick={() => { logout(); navigate('/'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4" />
                Kijelentkezés
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ==================== PUBLIC PAGES ====================

// Home Page
const HomePage = () => {
  const [sports, setSports] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sportsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/sports`),
        axios.get(`${API}/settings`)
      ]);
      setSports(sportsRes.data);
      setSettings(settingsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const defaultHeroImage = 'https://images.unsplash.com/photo-1761823473903-cabb1ac05527?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzcG9ydHMlMjBhcmVuYSUyMGV4dGVyaW9yJTIwc3VubnklMjBkYXl8ZW58MHx8fHwxNzcyNjM5Nzc1fDA&ixlib=rb-4.1.0&q=85';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${getImageUrl(settings?.hero_image) || defaultHeroImage}')`
          }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          {settings?.hero_title && (
            <h1 
              className="text-4xl md:text-6xl font-bold mb-6 animate-fadeIn"
              style={{fontFamily: 'Manrope'}}
            >
              {settings.hero_title}
            </h1>
          )}
          {settings?.hero_subtitle && (
            <p className="text-lg md:text-xl text-white/90 mb-8 animate-fadeIn stagger-1">
              {settings.hero_subtitle}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn stagger-2">
            <a href="#sports">
              <Button className="btn-primary text-lg px-10 py-6" data-testid="explore-sports-btn">
                <Activity className="mr-2 h-5 w-5" />
                Fedezd fel a sportokat
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Sports Section */}
      <section id="sports" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{fontFamily: 'Manrope'}}>
              Válassz sportot
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Böngéssz a sportkínálatunk között és foglalj helyet a számodra megfelelő eseményre
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner" />
            </div>
          ) : sports.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Még nincsenek sportok hozzáadva</p>
            </div>
          ) : (
            <div className="sport-grid">
              {sports.map((sport, idx) => (
                <Link to={`/sports/${sport.id}`} key={sport.id}>
                  <Card 
                    className="card-hover overflow-hidden cursor-pointer group animate-fadeIn"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    data-testid={`sport-card-${sport.id}`}
                  >
                    <div className="relative h-72 overflow-hidden">
                      <img 
                        src={getImageUrl(sport.image_url) || 'https://images.unsplash.com/photo-1761823533593-b7ee1d292202?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBzcG9ydHMlMjBhcmVuYSUyMGV4dGVyaW9yJTIwc3VubnklMjBkYXl8ZW58MHx8fHwxNzcyNjM5Nzc1fDA&ixlib=rb-4.1.0&q=85'}
                        alt={sport.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white" style={{fontFamily: 'Manrope'}}>
                          {sport.name}
                        </h3>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-slate-600 line-clamp-2">
                        {sport.description || 'Fedezd fel az eseményeket és foglalj helyet!'}
                      </p>
                      <div className="flex items-center text-[#2563EB] mt-4 font-medium">
                        <span>Események megtekintése</span>
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {settings?.footer_logo ? (
              <img 
                src={getImageUrl(settings.footer_logo)} 
                alt="Footer Logo" 
                style={{ height: `${settings?.site_logo_size || 32}px`, width: 'auto' }}
                className="object-contain" 
              />
            ) : (
              settings?.site_name && (
                <span className="font-bold text-2xl" style={{fontFamily: 'Manrope'}}>
                  {settings.site_name}
                </span>
              )
            )}
          </div>
          {settings?.footer_text && (
            <p className="text-slate-400">
              {settings.footer_text}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};

// Sport Events Page
const SportEventsPage = () => {
  const { sportId } = useParams();
  const [sport, setSport] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [sportId]);

  const fetchData = async () => {
    try {
      const [sportRes, eventsRes] = await Promise.all([
        axios.get(`${API}/sports/${sportId}`),
        axios.get(`${API}/events?sport_id=${sportId}`)
      ]);
      setSport(sportRes.data);
      setEvents(eventsRes.data);
    } catch (e) {
      toast.error("Hiba történt az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      {/* Header Image */}
      <div 
        className="relative h-64 bg-cover bg-center pt-16"
        style={{
          backgroundImage: `url('${getImageUrl(sport?.image_url) || 'https://images.unsplash.com/photo-1761823533593-b7ee1d292202'}')`
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza a főoldalra
            </Link>
            <h1 className="text-4xl font-bold text-white" style={{fontFamily: 'Manrope'}}>
              {sport?.name}
            </h1>
            <p className="text-white/80 mt-2">{sport?.description}</p>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-8" style={{fontFamily: 'Manrope'}}>
          Elérhető események
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Jelenleg nincs elérhető esemény</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, idx) => (
              <Link to={`/events/${event.id}`} key={event.id}>
                <Card 
                  className="card-hover overflow-hidden cursor-pointer group"
                  data-testid={`event-card-${event.id}`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={event.cover_image ? `${BACKEND_URL}${event.cover_image}` : sport?.image_url || 'https://images.unsplash.com/photo-1761823533593-b7ee1d292202'}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className={event.current_bookings >= event.max_capacity ? 'bg-red-500' : 'bg-green-500'}>
                        {event.current_bookings >= event.max_capacity ? 'Betelt' : 'Elérhető'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 mb-2" style={{fontFamily: 'Manrope'}}>
                      {event.name}
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#2563EB]" />
                        <span>{new Date(event.event_date).toLocaleDateString('hu-HU', { 
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#F97316]" />
                        <span>{event.current_bookings} / {event.max_capacity} résztvevő</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Event Details Page
const EventDetailsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loginWithToken } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [guestData, setGuestData] = useState({ guest_name: '', guest_email: '', guest_phone: '' });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API}/events/${eventId}`);
      setEvent(res.data);
    } catch (e) {
      toast.error("Esemény nem található");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const handleBookingClick = async () => {
    // If user is logged in, book directly
    if (user) {
      setBooking(true);
      try {
        await axios.post(`${API}/bookings`, { event_id: eventId });
        toast.success("Sikeres foglalás! Visszaigazoló emailt küldtünk.");
        navigate('/my-bookings');
      } catch (e) {
        toast.error(e.response?.data?.detail || "Hiba történt a foglalás során");
      } finally {
        setBooking(false);
      }
    } else {
      // Guest user - show modal
      setShowBookingModal(true);
    }
  };

  const handleGuestBooking = async (e) => {
    e.preventDefault();
    setBooking(true);
    try {
      const response = await axios.post(`${API}/bookings/guest`, { 
        event_id: eventId,
        ...guestData 
      });
      
      toast.success("Sikeres foglalás!");
      setShowBookingModal(false);
      
      // If new user was created, log them in automatically
      if (response.data.is_new_user && response.data.token) {
        await loginWithToken(response.data.token);
        setGeneratedPassword(response.data.generated_password);
        setShowPasswordModal(true);
      } else {
        // Existing user - just redirect
        toast.info("A foglalás visszaigazolását elküldtük emailben.");
        navigate('/my-bookings');
      }
      
      setGuestData({ guest_name: '', guest_email: '', guest_phone: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt a foglalás során");
    } finally {
      setBooking(false);
    }
  };

  const handlePasswordModalClose = (changePassword) => {
    setShowPasswordModal(false);
    if (changePassword) {
      navigate('/profile');
    } else {
      navigate('/my-bookings');
    }
  };

  if (loading) return <LoadingScreen />;

  const isFull = event?.current_bookings >= event?.max_capacity;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      {/* Header Image */}
      <div 
        className="relative h-80 bg-cover bg-center pt-16"
        style={{
          backgroundImage: `url('${getImageUrl(event?.cover_image) || 'https://images.unsplash.com/photo-1761823533593-b7ee1d292202'}')`
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-end pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
            <Link 
              to={`/sports/${event?.sport_id}`} 
              className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza a {event?.sport_name} eseményekhez
            </Link>
            <Badge className="mb-4 bg-[#2563EB]">{event?.sport_name}</Badge>
            <h1 className="text-4xl font-bold text-white" style={{fontFamily: 'Manrope'}}>
              {event?.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Details */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Esemény leírása</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">
                  {event?.description || 'Nincs leírás megadva.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Foglalás</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Időpont</p>
                      <p className="font-medium text-slate-900">
                        {new Date(event?.event_date).toLocaleDateString('hu-HU', { 
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-10 h-10 rounded-full bg-[#F97316]/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#F97316]" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Létszám</p>
                      <p className="font-medium text-slate-900">
                        {event?.current_bookings} / {event?.max_capacity} fő
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-[#2563EB]'}`}
                      style={{ width: `${(event?.current_bookings / event?.max_capacity) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 text-center">
                    {event?.max_capacity - event?.current_bookings} szabad hely
                  </p>
                </div>

                <Button 
                  className={`w-full ${isFull ? 'bg-slate-400' : 'btn-primary'}`}
                  disabled={isFull || booking}
                  onClick={handleBookingClick}
                  data-testid="book-event-btn"
                >
                  {booking ? (
                    <div className="spinner" />
                  ) : isFull ? (
                    'Betelt'
                  ) : (
                    'Foglalás'
                  )}
                </Button>
                
                {user && (
                  <p className="text-sm text-slate-500 text-center">
                    Bejelentkezve mint: <span className="font-medium">{user.name}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal - only for guests */}
      {showBookingModal && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBookingModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Foglalás - {event?.name}</CardTitle>
              <CardDescription>Add meg az adataidat a foglaláshoz</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestBooking} className="space-y-4">
                {/* Auto account info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Automatikus fiók létrehozás</p>
                      <p className="text-blue-600 mt-1">A foglalással automatikusan létrehozunk számodra egy felhasználói fiókot. A belépési jelszót emailben küldjük el. Bejelentkezés után kezelheted a foglalásaidat.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest_name">Név *</Label>
                  <Input 
                    id="guest_name"
                    value={guestData.guest_name} 
                    onChange={(e) => setGuestData({...guestData, guest_name: e.target.value})}
                    placeholder="Kovács Péter"
                    required
                    data-testid="booking-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest_email">Email cím *</Label>
                  <Input 
                    id="guest_email"
                    type="email"
                    value={guestData.guest_email} 
                    onChange={(e) => setGuestData({...guestData, guest_email: e.target.value})}
                    placeholder="pelda@email.hu"
                    required
                    data-testid="booking-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest_phone">Telefonszám</Label>
                  <Input 
                    id="guest_phone"
                    type="tel"
                    value={guestData.guest_phone} 
                    onChange={(e) => setGuestData({...guestData, guest_phone: e.target.value})}
                    placeholder="+36 30 123 4567"
                    data-testid="booking-phone-input"
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                  <p><strong>Esemény:</strong> {event?.name}</p>
                  <p><strong>Időpont:</strong> {new Date(event?.event_date).toLocaleDateString('hu-HU', { 
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}</p>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowBookingModal(false)}>
                    Mégse
                  </Button>
                  <Button type="submit" className="btn-primary" disabled={booking} data-testid="booking-submit-btn">
                    {booking ? <div className="spinner" /> : 'Foglalás megerősítése'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Change Modal - shown after automatic account creation */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Sikeres foglalás!</CardTitle>
              <CardDescription>A fiókod automatikusan létrejött</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Automatikusan generált jelszó:</p>
                    <p className="font-mono text-lg text-amber-900 mt-1 bg-amber-100 px-2 py-1 rounded">{generatedPassword}</p>
                    <p className="text-amber-700 text-sm mt-2">Ezt a jelszót emailben is elküldtük neked.</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-sm text-center">
                Szeretnéd most megváltoztatni a jelszavadat, vagy használod az automatikusan generáltat?
              </p>

              <div className="flex flex-col gap-2">
                <Button 
                  className="btn-primary w-full"
                  onClick={() => handlePasswordModalClose(true)}
                  data-testid="change-password-btn"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Jelszó megváltoztatása
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handlePasswordModalClose(false)}
                  data-testid="keep-password-btn"
                >
                  Maradok a generált jelszónál
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// My Bookings Page
const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/bookings/my`);
      setBookings(res.data);
    } catch (e) {
      toast.error("Hiba történt a foglalások betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Biztosan törölni szeretnéd a foglalást?')) return;
    
    try {
      await axios.delete(`${API}/bookings/${bookingId}`);
      toast.success("Foglalás törölve");
      fetchBookings();
    } catch (e) {
      toast.error("Hiba történt a törlés során");
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>
            Foglalásaim
          </h1>
        </div>

        {bookings.length === 0 ? (
          <Card className="text-center py-12">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Még nincsenek foglalásaid</p>
            <Link to="/">
              <Button className="btn-primary mt-4">Böngéssz események között</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden" data-testid={`booking-card-${booking.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={booking.status === 'active' ? 'default' : 'destructive'}>
                          {booking.status === 'active' ? 'Aktív' : 'Törölve'}
                        </Badge>
                        <Badge variant="secondary">{booking.sport_name}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">{booking.event_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(booking.event_date).toLocaleDateString('hu-HU', { 
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                    {booking.status === 'active' && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleCancel(booking.id)}
                        data-testid={`cancel-booking-${booking.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Lemondás
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== AUTH PAGES ====================

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'subadmin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success("Sikeres bejelentkezés!");
      if (loggedUser.role === 'admin' || loggedUser.role === 'subadmin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hibás bejelentkezési adatok");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex items-center justify-center px-4 pt-24 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{fontFamily: 'Manrope'}}>Bejelentkezés</CardTitle>
          <CardDescription>Add meg az adataidat a belépéshez</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pelda@email.hu"
                required
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input 
                id="password"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="login-password-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-primary"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? <div className="spinner" /> : 'Bejelentkezés'}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Még nincs fiókod?{' '}
            <Link to="/register" className="text-[#2563EB] hover:underline font-medium">
              Regisztrálj
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'subadmin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      toast.success("Sikeres regisztráció!");
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt a regisztráció során");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex items-center justify-center px-4 pt-24 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{fontFamily: 'Manrope'}}>Regisztráció</CardTitle>
          <CardDescription>Hozd létre fiókodat és foglalj eseményekre</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Teljes név</Label>
              <Input 
                id="name"
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Kovács Péter"
                required
                data-testid="register-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="pelda@email.hu"
                required
                data-testid="register-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefonszám (opcionális)</Label>
              <Input 
                id="phone"
                type="tel" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+36 30 123 4567"
                data-testid="register-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input 
                id="password"
                type="password" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                required
                minLength={6}
                data-testid="register-password-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-primary"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? <div className="spinner" /> : 'Regisztráció'}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Már van fiókod?{' '}
            <Link to="/login" className="text-[#2563EB] hover:underline font-medium">
              Jelentkezz be
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

// ==================== ADMIN PAGES ====================

// Admin Layout
const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get(`${API}/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const menuItems = user?.role === 'admin' ? [
    { icon: LayoutDashboard, label: 'Áttekintés', path: '/admin' },
    { icon: FolderOpen, label: 'Sportok', path: '/admin/sports' },
    { icon: CalendarDays, label: 'Események', path: '/admin/events' },
    { icon: UserCog, label: 'Subadminok', path: '/admin/subadmins' },
    { icon: BookOpen, label: 'Foglalások', path: '/admin/bookings' },
    { icon: Settings, label: 'Beállítások', path: '/admin/settings' },
    { icon: User, label: 'Profilom', path: '/admin/profile' },
  ] : [
    { icon: LayoutDashboard, label: 'Áttekintés', path: '/admin' },
    { icon: CalendarDays, label: 'Események', path: '/admin/events' },
    { icon: BookOpen, label: 'Foglalások', path: '/admin/bookings' },
    { icon: User, label: 'Profilom', path: '/admin/profile' },
  ];

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleNavClick = (path) => {
    // Close sidebar first, then navigate
    setSidebarOpen(false);
    // Small delay to ensure sidebar closes before navigation
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center gap-2">
            {settings?.site_logo ? (
              <img 
                src={getImageUrl(settings.site_logo)} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
              />
            ) : settings?.site_name ? (
              <span className="font-bold text-lg">{settings.site_name}</span>
            ) : null}
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-slate-100 hidden lg:block">
          <Link to="/" className="flex items-center gap-2">
            {settings?.site_logo ? (
              <img 
                src={getImageUrl(settings.site_logo)} 
                alt="Logo" 
                className="h-10 w-auto object-contain"
              />
            ) : settings?.site_name ? (
              <span className="font-bold text-xl text-slate-900" style={{fontFamily: 'Manrope'}}>{settings.site_name}</span>
            ) : null}
          </Link>
          {settings?.admin_panel_name && (
            <Badge className="mt-3" variant="outline">
              {settings.admin_panel_name}
            </Badge>
          )}
        </div>

        {/* Mobile sidebar header */}
        <div className="p-6 border-b border-slate-100 lg:hidden pt-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-slate-900">{user?.name}</p>
              <Badge variant="outline" className="mt-1">
                {user?.role === 'admin' ? 'Admin' : 'Subadmin'}
              </Badge>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`sidebar-item w-full ${location.pathname === item.path ? 'active' : ''}`}
              data-testid={`sidebar-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <button onClick={() => handleNavClick('/')} className="sidebar-item w-full mb-2">
            <HomeIcon className="h-5 w-5" />
            <span>Vissza a főoldalra</span>
          </button>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="sidebar-item text-red-600 hover:bg-red-50 w-full"
            data-testid="admin-logout-btn"
          >
            <LogOut className="h-5 w-5" />
            <span>Kijelentkezés</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="transition-all duration-300 pt-16 lg:pt-0 lg:ml-64">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`);
      setStats(res.data);
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  // Initialize admin on first load
  useEffect(() => {
    axios.post(`${API}/init-admin`).catch(() => {});
  }, []);

  if (loading) return <LoadingScreen />;

  const statCards = [
    { icon: FolderOpen, label: 'Sportok', value: stats?.total_sports || 0, color: 'bg-blue-500' },
    { icon: CalendarDays, label: 'Események', value: stats?.total_events || 0, color: 'bg-orange-500' },
    { icon: BookOpen, label: 'Aktív foglalások', value: stats?.total_bookings || 0, color: 'bg-green-500' },
    ...(user?.role === 'admin' ? [
      { icon: Users, label: 'Felhasználók', value: stats?.total_users || 0, color: 'bg-purple-500' },
      { icon: Shield, label: 'Subadminok', value: stats?.total_subadmins || 0, color: 'bg-pink-500' },
    ] : [])
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>
            Üdvözöllek, {user?.name}!
          </h1>
          <p className="text-slate-500 mt-1">Itt láthatod a rendszer áttekintését</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {statCards.map((stat, idx) => (
            <Card key={idx} className="card-hover" data-testid={`stat-${stat.label.toLowerCase()}`}>
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-slate-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Gyors műveletek</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {user?.role === 'admin' && (
              <Link to="/admin/sports">
                <Button className="btn-primary" data-testid="quick-add-sport">
                  <Plus className="h-4 w-4 mr-2" />
                  Új sport
                </Button>
              </Link>
            )}
            <Link to="/admin/events">
              <Button className="btn-secondary" data-testid="quick-add-event">
                <Plus className="h-4 w-4 mr-2" />
                Új esemény
              </Button>
            </Link>
            <Link to="/admin/bookings">
              <Button variant="outline" data-testid="quick-view-bookings">
                <BookOpen className="h-4 w-4 mr-2" />
                Foglalások megtekintése
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

// Admin Sports Page
const AdminSportsPage = () => {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSport, setEditingSport] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', image_url: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    try {
      const res = await axios.get(`${API}/sports`);
      setSports(res.data);
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (sport = null) => {
    setEditingSport(sport);
    setFormData(sport ? { name: sport.name, description: sport.description || '', image_url: sport.image_url || '' } : { name: '', description: '', image_url: '' });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await axios.post(`${API}/upload`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({...formData, image_url: res.data.url});
      toast.success("Kép feltöltve");
    } catch (e) {
      toast.error("Hiba a kép feltöltésekor");
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSport) {
        await axios.put(`${API}/admin/sports/${editingSport.id}`, formData);
        toast.success("Sport módosítva");
      } else {
        await axios.post(`${API}/admin/sports`, formData);
        toast.success("Sport létrehozva");
      }
      setShowModal(false);
      fetchSports();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd? Ez törli az összes kapcsolódó eseményt és foglalást is!')) return;
    try {
      await axios.delete(`${API}/admin/sports/${id}`);
      toast.success("Sport törölve");
      fetchSports();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  if (loading) return <AdminLayout><LoadingScreen /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Sportok kezelése</h1>
            <p className="text-slate-500 mt-1">Hozz létre és kezelj sport kategóriákat</p>
          </div>
          <Button className="btn-primary" onClick={() => openModal()} data-testid="add-sport-btn">
            <Plus className="h-4 w-4 mr-2" />
            Új sport
          </Button>
        </div>

        {sports.length === 0 ? (
          <Card className="text-center py-16">
            <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Még nincsenek sportok</p>
            <Button className="btn-primary mt-4" onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Első sport hozzáadása
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sports.map((sport) => (
              <Card key={sport.id} className="overflow-hidden" data-testid={`admin-sport-${sport.id}`}>
                <div className="relative h-40">
                  <img 
                    src={getImageUrl(sport.image_url) || 'https://images.unsplash.com/photo-1761823533593-b7ee1d292202'}
                    alt={sport.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">{sport.name}</h3>
                </div>
                <CardContent className="p-4">
                  <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                    {sport.description || 'Nincs leírás'}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openModal(sport)} data-testid={`edit-sport-${sport.id}`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Szerkesztés
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(sport.id)} data-testid={`delete-sport-${sport.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>{editingSport ? 'Sport szerkesztése' : 'Új sport'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Név</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      data-testid="sport-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Leírás</Label>
                    <Input 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      data-testid="sport-description-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sport kép</Label>
                    <div className="space-y-3">
                      <Input 
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        data-testid="sport-image-upload"
                      />
                      {uploading && <p className="text-sm text-slate-500">Feltöltés...</p>}
                      {formData.image_url && (
                        <div className="relative">
                          <img 
                            src={getImageUrl(formData.image_url)}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button 
                            type="button"
                            variant="destructive" 
                            size="sm" 
                            className="absolute top-2 right-2"
                            onClick={() => setFormData({...formData, image_url: ''})}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Mégse</Button>
                    <Button type="submit" className="btn-primary" disabled={saving || uploading} data-testid="sport-submit-btn">
                      {saving ? 'Mentés...' : (editingSport ? 'Mentés' : 'Létrehozás')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Admin Events Page
const AdminEventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', description: '', sport_id: '', event_date: '', max_capacity: 50, cover_image: '' 
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, sportsRes] = await Promise.all([
        axios.get(`${API}/events`),
        axios.get(`${API}/sports`)
      ]);
      
      // Filter events for subadmin
      let filteredEvents = eventsRes.data;
      if (user?.role === 'subadmin') {
        filteredEvents = eventsRes.data.filter(e => user.assigned_sports.includes(e.sport_id));
      }
      
      // Filter sports for subadmin
      let filteredSports = sportsRes.data;
      if (user?.role === 'subadmin') {
        filteredSports = sportsRes.data.filter(s => user.assigned_sports.includes(s.id));
      }
      
      setEvents(filteredEvents);
      setSports(filteredSports);
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (event = null) => {
    setEditingEvent(event);
    if (event) {
      setFormData({
        name: event.name,
        description: event.description || '',
        sport_id: event.sport_id,
        event_date: event.event_date.slice(0, 16),
        max_capacity: event.max_capacity,
        cover_image: event.cover_image || ''
      });
    } else {
      setFormData({ 
        name: '', description: '', sport_id: sports[0]?.id || '', event_date: '', max_capacity: 50, cover_image: '' 
      });
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await axios.post(`${API}/upload`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({...formData, cover_image: res.data.url});
      toast.success("Kép feltöltve");
    } catch (e) {
      toast.error("Hiba a kép feltöltésekor");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingEvent) {
        await axios.put(`${API}/admin/events/${editingEvent.id}`, formData);
        toast.success("Esemény módosítva");
      } else {
        await axios.post(`${API}/admin/events`, formData);
        toast.success("Esemény létrehozva");
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd az eseményt?')) return;
    try {
      await axios.delete(`${API}/admin/events/${id}`);
      toast.success("Esemény törölve");
      fetchData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  if (loading) return <AdminLayout><LoadingScreen /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Események kezelése</h1>
            <p className="text-slate-500 mt-1">Hozz létre és kezelj eseményeket</p>
          </div>
          <Button className="btn-primary" onClick={() => openModal()} data-testid="add-event-btn" disabled={sports.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Új esemény
          </Button>
        </div>

        {sports.length === 0 ? (
          <Card className="text-center py-16">
            <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Először hozz létre sportokat</p>
            {user?.role === 'admin' && (
              <Link to="/admin/sports">
                <Button className="btn-primary mt-4">Sportok kezelése</Button>
              </Link>
            )}
          </Card>
        ) : events.length === 0 ? (
          <Card className="text-center py-16">
            <CalendarDays className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Még nincsenek események</p>
            <Button className="btn-primary mt-4" onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Első esemény hozzáadása
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden" data-testid={`admin-event-${event.id}`}>
                <div className="relative h-40">
                  <img 
                    src={event.cover_image ? `${BACKEND_URL}${event.cover_image}` : 'https://images.unsplash.com/photo-1761823533593-b7ee1d292202'}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-4 right-4">{event.sport_name}</Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{event.name}</h3>
                  <div className="space-y-1 text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.event_date).toLocaleDateString('hu-HU', { 
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {event.current_bookings} / {event.max_capacity} fő
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openModal(event)} data-testid={`edit-event-${event.id}`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Szerkesztés
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(event.id)} data-testid={`delete-event-${event.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>{editingEvent ? 'Esemény szerkesztése' : 'Új esemény'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sport kategória</Label>
                    <select 
                      className="w-full h-11 px-3 rounded-lg border border-input bg-background"
                      value={formData.sport_id}
                      onChange={(e) => setFormData({...formData, sport_id: e.target.value})}
                      required
                      data-testid="event-sport-select"
                    >
                      <option value="">Válassz sportot...</option>
                      {sports.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Esemény neve</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      data-testid="event-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Leírás</Label>
                    <textarea 
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background min-h-[100px]"
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      data-testid="event-description-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Időpont</Label>
                      <Input 
                        type="datetime-local"
                        value={formData.event_date} 
                        onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                        required
                        data-testid="event-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max létszám</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={formData.max_capacity} 
                        onChange={(e) => setFormData({...formData, max_capacity: parseInt(e.target.value)})}
                        required
                        data-testid="event-capacity-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Borítókép</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        data-testid="event-image-upload"
                      />
                    </div>
                    {formData.cover_image && (
                      <img 
                        src={formData.cover_image.startsWith('http') ? formData.cover_image : `${BACKEND_URL}${formData.cover_image}`}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg mt-2"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Mégse</Button>
                    <Button type="submit" className="btn-primary" disabled={saving} data-testid="event-submit-btn">
                      {saving ? 'Mentés...' : (editingEvent ? 'Mentés' : 'Létrehozás')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Admin Subadmins Page
const AdminSubadminsPage = () => {
  const [subadmins, setSubadmins] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubadmin, setEditingSubadmin] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', assigned_sports: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subadminsRes, sportsRes] = await Promise.all([
        axios.get(`${API}/admin/subadmins`),
        axios.get(`${API}/sports`)
      ]);
      setSubadmins(subadminsRes.data);
      setSports(sportsRes.data);
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (subadmin = null) => {
    setEditingSubadmin(subadmin);
    if (subadmin) {
      setFormData({
        name: subadmin.name,
        email: subadmin.email,
        password: '',
        phone: subadmin.phone || '',
        assigned_sports: subadmin.assigned_sports || []
      });
    } else {
      setFormData({ name: '', email: '', password: '', phone: '', assigned_sports: [] });
    }
    setShowModal(true);
  };

  const handleSportToggle = (sportId) => {
    setFormData(prev => ({
      ...prev,
      assigned_sports: prev.assigned_sports.includes(sportId)
        ? prev.assigned_sports.filter(id => id !== sportId)
        : [...prev.assigned_sports, sportId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSubadmin) {
        await axios.put(`${API}/admin/subadmins/${editingSubadmin.id}`, {
          name: formData.name,
          assigned_sports: formData.assigned_sports
        });
        toast.success("Subadmin módosítva");
      } else {
        await axios.post(`${API}/admin/subadmins`, formData);
        toast.success("Subadmin létrehozva");
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd a subadmint?')) return;
    try {
      await axios.delete(`${API}/admin/subadmins/${id}`);
      toast.success("Subadmin törölve");
      fetchData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const getSportNames = (sportIds) => {
    return sportIds.map(id => sports.find(s => s.id === id)?.name).filter(Boolean).join(', ');
  };

  if (loading) return <AdminLayout><LoadingScreen /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Subadminok kezelése</h1>
            <p className="text-slate-500 mt-1">Hozz létre subadminokat és rendeld hozzá sportokhoz</p>
          </div>
          <Button className="btn-primary" onClick={() => openModal()} data-testid="add-subadmin-btn">
            <Plus className="h-4 w-4 mr-2" />
            Új subadmin
          </Button>
        </div>

        {subadmins.length === 0 ? (
          <Card className="text-center py-16">
            <UserCog className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Még nincsenek subadminok</p>
            <Button className="btn-primary mt-4" onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Első subadmin hozzáadása
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subadmins.map((subadmin) => (
              <Card key={subadmin.id} data-testid={`admin-subadmin-${subadmin.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xl font-bold">
                      {subadmin.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{subadmin.name}</h3>
                      <p className="text-sm text-slate-500">{subadmin.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    {subadmin.phone && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="h-4 w-4" />
                        {subadmin.phone}
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-slate-500">
                      <FolderOpen className="h-4 w-4 mt-0.5" />
                      <span>{getSportNames(subadmin.assigned_sports || []) || 'Nincs hozzárendelve'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openModal(subadmin)} data-testid={`edit-subadmin-${subadmin.id}`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Szerkesztés
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(subadmin.id)} data-testid={`delete-subadmin-${subadmin.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>{editingSubadmin ? 'Subadmin szerkesztése' : 'Új subadmin'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Név</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      data-testid="subadmin-name-input"
                    />
                  </div>
                  {!editingSubadmin && (
                    <>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input 
                          type="email"
                          value={formData.email} 
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          data-testid="subadmin-email-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jelszó</Label>
                        <Input 
                          type="password"
                          value={formData.password} 
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required
                          minLength={6}
                          data-testid="subadmin-password-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefonszám (opcionális)</Label>
                        <Input 
                          type="tel"
                          value={formData.phone} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          data-testid="subadmin-phone-input"
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Hozzárendelt sportok</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                      {sports.length === 0 ? (
                        <p className="text-sm text-slate-500">Még nincsenek sportok</p>
                      ) : (
                        sports.map(sport => (
                          <label key={sport.id} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.assigned_sports.includes(sport.id)}
                              onChange={() => handleSportToggle(sport.id)}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm">{sport.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Mégse</Button>
                    <Button type="submit" className="btn-primary" disabled={saving} data-testid="subadmin-submit-btn">
                      {saving ? 'Mentés...' : (editingSubadmin ? 'Mentés' : 'Létrehozás')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Admin Bookings Page
const AdminBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, booking: null });

  useEffect(() => {
    fetchData();
  }, [filterEvent]);

  const fetchData = async () => {
    try {
      const [bookingsRes, eventsRes] = await Promise.all([
        axios.get(`${API}/admin/bookings${filterEvent ? `?event_id=${filterEvent}` : ''}`),
        axios.get(`${API}/events`)
      ]);
      
      let filteredEvents = eventsRes.data;
      if (user?.role === 'subadmin') {
        filteredEvents = eventsRes.data.filter(e => user.assigned_sports.includes(e.sport_id));
      }
      
      setBookings(bookingsRes.data);
      setEvents(filteredEvents);
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Biztosan le szeretnéd mondani a foglalást?')) return;
    try {
      await axios.delete(`${API}/bookings/${bookingId}`);
      toast.success("Foglalás lemondva");
      fetchData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteModal.booking) return;
    try {
      await axios.delete(`${API}/admin/bookings/${deleteModal.booking.id}/permanent`);
      toast.success("Foglalás véglegesen törölve");
      setDeleteModal({ open: false, booking: null });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    }
  };

  if (loading) return <AdminLayout><LoadingScreen /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Foglalások</h1>
            <p className="text-slate-500 mt-1">Kezeld a foglalásokat</p>
          </div>
          <select 
            className="h-11 px-4 rounded-lg border border-input bg-background w-full sm:w-64"
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            data-testid="booking-filter-select"
          >
            <option value="">Minden esemény</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name} - {e.sport_name}</option>
            ))}
          </select>
        </div>

        {bookings.length === 0 ? (
          <Card className="text-center py-16">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nincsenek foglalások</p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-600">Résztvevő</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Esemény</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Időpont</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Státusz</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="table-row border-b" data-testid={`booking-row-${booking.id}`}>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">{booking.user_name}</p>
                          <p className="text-sm text-slate-500">{booking.user_email}</p>
                          {booking.user_phone && (
                            <p className="text-sm text-slate-500">{booking.user_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-900">{booking.event_name}</p>
                        <Badge variant="secondary" className="mt-1">{booking.sport_name}</Badge>
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(booking.event_date).toLocaleDateString('hu-HU', { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4">
                        <Badge variant={booking.status === 'active' ? 'default' : 'destructive'}>
                          {booking.status === 'active' ? 'Aktív' : 'Törölve'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {booking.status === 'active' && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleCancel(booking.id)}
                              data-testid={`cancel-admin-booking-${booking.id}`}
                              title="Lemondás"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {booking.status === 'cancelled' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => setDeleteModal({ open: true, booking })}
                              data-testid={`permanent-delete-booking-${booking.id}`}
                              title="Végleges törlés"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Permanent Delete Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="permanent-delete-modal">
            <Card className="w-full max-w-md mx-4 p-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Végleges törlés</h3>
                <p className="text-slate-500 mb-6">
                  Biztosan véglegesen törölni szeretnéd <strong>{deleteModal.booking?.user_name}</strong> foglalását a(z) <strong>{deleteModal.booking?.event_name}</strong> eseményre? 
                  <br /><br />
                  <span className="text-red-600 font-medium">Ez a művelet nem vonható vissza!</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteModal({ open: false, booking: null })}
                    data-testid="cancel-permanent-delete"
                  >
                    Mégse
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handlePermanentDelete}
                    data-testid="confirm-permanent-delete"
                  >
                    Végleges törlés
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// ==================== ADMIN SETTINGS PAGE ====================

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    site_name: '',
    site_logo: '',
    site_logo_size: 32,
    admin_panel_name: '',
    hero_title: '',
    hero_subtitle: '',
    hero_image: '',
    footer_text: '',
    footer_logo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading({...uploading, [field]: true});
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await axios.post(`${API}/upload`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings({...settings, [field]: res.data.url});
      toast.success("Kép feltöltve");
    } catch (e) {
      toast.error("Hiba a kép feltöltésekor");
    } finally {
      setUploading({...uploading, [field]: false});
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, settings);
      toast.success("Beállítások mentve");
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout><LoadingScreen /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Oldal beállítások</h1>
          <p className="text-slate-500 mt-1">Testreszabhatod az oldal megjelenését</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Általános beállítások
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Oldal neve</Label>
                  <Input 
                    value={settings.site_name || ''} 
                    onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                    placeholder="pl. Kanizsa Aréna"
                    data-testid="settings-site-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin panel neve</Label>
                  <Input 
                    value={settings.admin_panel_name || ''} 
                    onChange={(e) => setSettings({...settings, admin_panel_name: e.target.value})}
                    placeholder="pl. Admin Panel"
                    data-testid="settings-admin-panel-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Oldal logó</Label>
                <Input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'site_logo')}
                  disabled={uploading.site_logo}
                  data-testid="settings-site-logo-upload"
                />
                {settings.site_logo && (
                  <div className="flex items-center gap-2 mt-2">
                    <img src={getImageUrl(settings.site_logo)} alt="Logo" className="h-10 w-10 object-contain rounded" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSettings({...settings, site_logo: ''})}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Logo Size Slider */}
              {settings.site_logo && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Logó méret</Label>
                    <span className="text-sm font-medium text-slate-600">{settings.site_logo_size || 32}px</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="120"
                    value={settings.site_logo_size || 32}
                    onChange={(e) => setSettings({...settings, site_logo_size: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    data-testid="settings-logo-size"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>24px</span>
                    <span>120px</span>
                  </div>
                  <div className="bg-slate-100 rounded-lg p-4 flex items-center justify-center">
                    <div className="bg-black rounded-lg px-4 py-2 flex items-center gap-2">
                      <img 
                        src={getImageUrl(settings.site_logo)} 
                        alt="Logo preview" 
                        style={{ height: `${settings.site_logo_size || 32}px` }}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Kezdőoldal - Hero szekció
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Főcím</Label>
                <Input 
                  value={settings.hero_title || ''} 
                  onChange={(e) => setSettings({...settings, hero_title: e.target.value})}
                  placeholder="pl. Sport, Koncertek, Élmények"
                  data-testid="settings-hero-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Alcím</Label>
                <Input 
                  value={settings.hero_subtitle || ''} 
                  onChange={(e) => setSettings({...settings, hero_subtitle: e.target.value})}
                  placeholder="pl. A város multifunkcionális sport- és rendezvényközpontja"
                  data-testid="settings-hero-subtitle"
                />
              </div>
              <div className="space-y-2">
                <Label>Háttérkép</Label>
                <Input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'hero_image')}
                  disabled={uploading.hero_image}
                  data-testid="settings-hero-image-upload"
                />
                {settings.hero_image && (
                  <div className="relative mt-2">
                    <img src={getImageUrl(settings.hero_image)} alt="Hero" className="w-full h-40 object-cover rounded-lg" />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2"
                      onClick={() => setSettings({...settings, hero_image: ''})}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Lábléc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lábléc szöveg</Label>
                <Input 
                  value={settings.footer_text || ''} 
                  onChange={(e) => setSettings({...settings, footer_text: e.target.value})}
                  placeholder="pl. © 2024 Aréna Sport- és Rendezvényközpont. Minden jog fenntartva."
                  data-testid="settings-footer-text"
                />
              </div>
              <div className="space-y-2">
                <Label>Lábléc logó (opcionális)</Label>
                <Input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'footer_logo')}
                  disabled={uploading.footer_logo}
                  data-testid="settings-footer-logo-upload"
                />
                {settings.footer_logo && (
                  <div className="flex items-center gap-2 mt-2">
                    <img src={getImageUrl(settings.footer_logo)} alt="Footer Logo" className="h-10 w-10 object-contain rounded" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSettings({...settings, footer_logo: ''})}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="btn-primary" disabled={saving} data-testid="settings-save-btn">
              {saving ? 'Mentés...' : 'Beállítások mentése'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

// ==================== ADMIN PROFILE PAGE ====================

const AdminProfilePage = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error("Az új jelszavak nem egyeznek");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      };
      
      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }

      await axios.put(`${API}/auth/profile`, updateData);
      toast.success("Profil frissítve");
      
      // If email changed, need to re-login
      if (formData.email !== user.email) {
        toast.info("Az email cím megváltozott, kérjük jelentkezz be újra");
        logout();
        navigate('/login');
      } else {
        await refreshUser();
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Profilom</h1>
          <p className="text-slate-500 mt-1">Szerkeszd a fiókod adatait</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Személyes adatok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Név</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="profile-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="profile-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefonszám</Label>
                <Input 
                  type="tel"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+36 30 123 4567"
                  data-testid="profile-phone-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Jelszó módosítása
              </CardTitle>
              <CardDescription>Hagyd üresen ha nem szeretnéd módosítani</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Jelenlegi jelszó</Label>
                <Input 
                  type="password"
                  value={formData.current_password} 
                  onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                  data-testid="profile-current-password-input"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Új jelszó</Label>
                  <Input 
                    type="password"
                    value={formData.new_password} 
                    onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                    minLength={6}
                    data-testid="profile-new-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Új jelszó megerősítése</Label>
                  <Input 
                    type="password"
                    value={formData.confirm_password} 
                    onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                    minLength={6}
                    data-testid="profile-confirm-password-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="btn-primary" disabled={saving} data-testid="profile-save-btn">
              {saving ? 'Mentés...' : 'Profil mentése'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

// ==================== USER PROFILE PAGE (for regular users) ====================

const UserProfilePage = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error("Az új jelszavak nem egyeznek");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      };
      
      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }

      await axios.put(`${API}/auth/profile`, updateData);
      toast.success("Profil frissítve");
      
      if (formData.email !== user.email) {
        toast.info("Az email cím megváltozott, kérjük jelentkezz be újra");
        logout();
        navigate('/login');
      } else {
        await refreshUser();
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{fontFamily: 'Manrope'}}>Profilom</h1>
            <p className="text-slate-500 mt-1">Szerkeszd a fiókod adatait</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Személyes adatok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Név</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="user-profile-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="user-profile-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefonszám</Label>
                <Input 
                  type="tel"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+36 30 123 4567"
                  data-testid="user-profile-phone-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Jelszó módosítása
              </CardTitle>
              <CardDescription>Hagyd üresen ha nem szeretnéd módosítani</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Jelenlegi jelszó</Label>
                <Input 
                  type="password"
                  value={formData.current_password} 
                  onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                  data-testid="user-profile-current-password-input"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Új jelszó</Label>
                  <Input 
                    type="password"
                    value={formData.new_password} 
                    onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                    minLength={6}
                    data-testid="user-profile-new-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Új jelszó megerősítése</Label>
                  <Input 
                    type="password"
                    value={formData.confirm_password} 
                    onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                    minLength={6}
                    data-testid="user-profile-confirm-password-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="btn-primary" disabled={saving} data-testid="user-profile-save-btn">
              {saving ? 'Mentés...' : 'Profil mentése'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/sports/:sportId" element={<SportEventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected user routes */}
          <Route path="/my-bookings" element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin', 'subadmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/sports" element={
            <ProtectedRoute roles={['admin']}>
              <AdminSportsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/events" element={
            <ProtectedRoute roles={['admin', 'subadmin']}>
              <AdminEventsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/subadmins" element={
            <ProtectedRoute roles={['admin']}>
              <AdminSubadminsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute roles={['admin', 'subadmin']}>
              <AdminBookingsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['admin']}>
              <AdminSettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute roles={['admin', 'subadmin']}>
              <AdminProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
