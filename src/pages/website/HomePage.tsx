import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import {
  ArrowRight, Star, Wrench, Car, Shield, Clock, MapPin, CheckCircle,
  Phone, Calendar, ChevronRight, Award, Users, Zap, ThumbsUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const services = [
  { img: 'https://images.pexels.com/photos/13065690/pexels-photo-13065690.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1', name: 'Basic Service', price: '₹1,499', desc: 'Oil change, filter & inspection', time: '90 min' },
  { img: 'https://images.pexels.com/photos/8985452/pexels-photo-8985452.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1', name: 'Full Service', price: '₹3,999', desc: 'Comprehensive vehicle service', time: '3 hrs' },
  { img: 'https://images.pexels.com/photos/28490734/pexels-photo-28490734.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1', name: 'AC Service', price: '₹1,999', desc: 'Gas refill & compressor check', time: '2 hrs' },
  { img: 'https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1', name: 'Tyre Service', price: '₹599', desc: 'Rotation, balancing & alignment', time: '1 hr' },
  { img: 'https://images.pexels.com/photos/5233271/pexels-photo-5233271.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1', name: 'Car Wash', price: '₹799', desc: 'Premium wash & interior detail', time: '90 min' },
  { img: 'https://images.pexels.com/photos/8478228/pexels-photo-8478228.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1', name: 'Battery Check', price: '₹499', desc: 'Health check & replacement', time: '30 min' },
];

const reviews = [
  { name: 'Sourav Das', car: 'Maruti Swift', rating: 5, text: 'Excellent service! My car was ready on time and the quality of work was outstanding. The pickup/drop service is a game changer.', avatar: 'S' },
  { name: 'Priya Ghosh', car: 'Honda City', rating: 5, text: 'Very professional team. The live tracking feature helped me know exactly when my car was ready. Will definitely recommend to friends.', avatar: 'P' },
  { name: 'Arijit Roy', car: 'Hyundai Creta', rating: 4, text: 'Great experience overall. Transparent pricing and detailed invoice. The online booking system is super convenient from Mumbai.', avatar: 'A' },
];

const stats = [
  { value: '5,000+', label: 'Happy Customers' },
  { value: '20,000+', label: 'Services Done' },
  { value: '15+', label: 'Expert Mechanics' },
  { value: '4.9★', label: 'Average Rating' },
];

export default function HomePage() {
  const [slide, setSlide] = useState(0);
  const [liveReviews, setLiveReviews] = useState(reviews);
  const [ratingForm, setRatingForm] = useState({ name: '', car_model: '', rating: 5, comment: '' });
  const [ratingSent, setRatingSent] = useState(false);
  const [ratingError, setRatingError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setSlide(current => (current + 1) % services.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      const { data } = await supabase
        .from('site_ratings')
        .select('id, name, car_model, rating, comment')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);
      if (data && data.length > 0) {
        setLiveReviews(data.map(review => ({
          name: review.name,
          car: review.car_model || 'Car owner',
          rating: review.rating,
          text: review.comment || 'Great service from NMR Car Services.',
          avatar: review.name.charAt(0).toUpperCase(),
        })));
      }
    };
    void loadReviews();
  }, []);

  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className="relative pt-16 min-h-screen flex items-center bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/33814734/pexels-photo-33814734.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-800/75 to-red-900/65" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm font-medium">Mumbai's Trusted Car Service Workshop</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Your Car Deserves<br />
              <span className="text-red-400">Expert Care</span>
            </h1>

            <p className="text-lg text-gray-300 mb-4 max-w-xl leading-relaxed">
              Professional car service &amp; repairs at NMR Car Services, Mumbai.
              Book online, track in real-time, pay digitally. Certified mechanics, transparent pricing.
            </p>

            <div className="flex items-center gap-2 text-gray-400 text-sm mb-8">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <span> Mumbai, Maharashtra</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/book"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 text-sm">
                <Calendar className="w-5 h-5" />
                Book a Service
              </Link>
              <Link to="/services"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20 text-sm">
                View All Services
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-6">
              {[
                { icon: <Clock className="w-4 h-4" />, label: 'On-Time Delivery' },
                { icon: <Award className="w-4 h-4" />, label: 'Certified Mechanics' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-gray-300 text-sm">
                  <span className="text-red-400">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service Carousel */}
      <section className="py-14 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gray-950 min-h-[320px] shadow-2xl">
            {services.map((service, index) => (
              <div key={service.name} className={`absolute inset-0 transition-all duration-700 ${index === slide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
                <img src={service.img} alt={service.name} className="w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />
                <div className="absolute inset-0 flex items-center p-8 sm:p-14">
                  <div className="max-w-lg text-white animate-[fadeIn_700ms_ease-out]">
                    <p className="text-red-400 uppercase tracking-[0.25em] text-xs font-bold mb-3">NMR Car Services • Mumbai</p>
                    <h2 className="text-3xl sm:text-5xl font-bold mb-3">{service.name}</h2>
                    <p className="text-gray-300 mb-6">{service.desc} with transparent pricing and trained technicians.</p>
                    <Link to="/book" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500 transition-colors">Book this service <ArrowRight className="w-4 h-4" /></Link>
                  </div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-6 right-6 flex gap-2">
              {services.map((service, index) => <button key={service.name} aria-label={`Show ${service.name}`} onClick={() => setSlide(index)} className={`h-2 rounded-full transition-all ${index === slide ? 'w-8 bg-red-500' : 'w-2 bg-white/60'}`} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Workshop Gallery */}
      <section className="py-14 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Our Workshop</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">State-of-the-art facility in Mumbai</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden shadow-md h-56 md:h-auto">
              <img src="https://images.pexels.com/photos/33814734/pexels-photo-33814734.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="NMR Car Services" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md h-56">
              <img src="https://images.pexels.com/photos/17600886/pexels-photo-17600886.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="Workshop Bay" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md h-56">
              <img src="https://images.pexels.com/photos/37163499/pexels-photo-37163499.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="Service in Progress" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="col-span-2 rounded-2xl overflow-hidden shadow-md h-44">
              <img src="https://images.pexels.com/photos/6870331/pexels-photo-6870331.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="Expert Mechanics" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 rounded-full px-4 py-1.5 mb-4">
              <Wrench className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-400 text-sm font-medium">Our Services</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Everything Your Car Needs</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">From routine maintenance to complex repairs, our certified technicians handle it all with genuine parts and premium tools.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {services.map(s => (
              <div key={s.name}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 hover:shadow-lg hover:-translate-y-1 transition-all group cursor-pointer">
                <div className="h-40 overflow-hidden rounded-xl mb-4">
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{s.name}</h3>
                  <span className="text-red-600 dark:text-red-400 font-bold">{s.price}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{s.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {s.time}
                  </span>
                  <Link to="/book" className="text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Book Now <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/services" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-red-600 text-red-600 font-semibold rounded-xl hover:bg-red-600 hover:text-white transition-all">
              View All Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 rounded-full px-4 py-1.5 mb-4">
                <ThumbsUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-red-700 dark:text-red-400 text-sm font-medium">Why NMR Car Services</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">The Smarter Way to Service Your Car</h2>
              <div className="space-y-4">
                {[
                  { icon: <Users className="w-5 h-5 text-blue-600" />, title: 'Certified Technicians', desc: '15+ certified mechanics with minimum 3 years of experience.' },
                  { icon: <CheckCircle className="w-5 h-5 text-red-600" />, title: 'Transparent Pricing', desc: 'No hidden charges. Get exact pricing before we start any work.' },
                  { icon: <Clock className="w-5 h-5 text-orange-600" />, title: 'On-Time Delivery', desc: '98% of our bookings are delivered on the promised time or earlier.' },
                ].map(f => (
                  <div key={f.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700 shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{f.title}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img src="https://images.pexels.com/photos/17600886/pexels-photo-17600886.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="Mechanic working at NMR Car Services"
                className="rounded-2xl shadow-xl w-full object-cover h-[480px]" />
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Service Completed!</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mumbai</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 rounded-full px-4 py-1.5 mb-4">
                <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-red-700 dark:text-red-400 text-sm font-medium">Find Us</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Visit Our Workshop</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Conveniently located in Mumbai — easy to reach from all parts of the city. Ample parking available. Open 6 days a week.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Address</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Mumbai, Maharashtra</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Phone</p>
                    <a href="tel:629182859" className="text-gray-500 dark:text-gray-400 text-sm hover:text-red-600 transition-colors">629182859</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Working Hours</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Mon–Sat: 8:00 AM – 8:00 PM<br />Sunday: 9:00 AM – 5:00 PM</p>
                  </div>
                </div>
              </div>
              <a href="https://maps.google.com/?q=Mumbai+Maharashtra"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md shadow-red-600/20">
                <MapPin className="w-4 h-4" /> Get Directions on Google Maps
              </a>
            </div>
            {/* Google Maps Embed */}
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-slate-700 h-80 lg:h-[420px]">
              <iframe
                title="NMR Car Services Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.1244!2d72.8777!3d19.0760!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMumbai%2C+Maharashtra!5e0!3m2!1sen!2sin!4v1600000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">What Our Customers Say</h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
              <span className="ml-2 text-gray-600 dark:text-gray-400 font-medium">Live customer ratings from Mumbai</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {liveReviews.map(r => (
              <div key={r.name} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{r.avatar}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.car}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={async event => {
            event.preventDefault();
            setRatingError('');
            const { error } = await supabase.from('site_ratings').insert(ratingForm);
            if (error) {
              setRatingError('We could not publish your rating. Please try again.');
            } else {
              setRatingSent(true);
              setRatingForm({ name: '', car_model: '', rating: 5, comment: '' });
            }
          }} className="mt-10 max-w-3xl mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
            {ratingSent ? <div className="text-center py-3"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="font-semibold text-gray-900 dark:text-white">Thank you for rating NMR Car Services.</p><p className="text-sm text-gray-500 dark:text-gray-400">Your review is now live on our website.</p></div> : <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><div><h3 className="font-bold text-gray-900 dark:text-white">Share your experience</h3><p className="text-sm text-gray-500 dark:text-gray-400">No login required.</p></div><div className="flex gap-1">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-label={`${value} stars`} onClick={() => setRatingForm(form => ({ ...form, rating: value }))}><Star className={`w-5 h-5 ${value <= ratingForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /></button>)}</div></div>
              <div className="grid sm:grid-cols-2 gap-3"><input required value={ratingForm.name} onChange={event => setRatingForm(form => ({ ...form, name: event.target.value }))} placeholder="Your name" className="rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2.5 text-sm" /><input value={ratingForm.car_model} onChange={event => setRatingForm(form => ({ ...form, car_model: event.target.value }))} placeholder="Car model (optional)" className="rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2.5 text-sm" /></div>
              <textarea required value={ratingForm.comment} onChange={event => setRatingForm(form => ({ ...form, comment: event.target.value }))} placeholder="Tell us about your visit" rows={3} className="mt-3 w-full rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2.5 text-sm" />
              {ratingError && <p className="mt-2 text-sm text-red-600">{ratingError}</p>}<button type="submit" className="mt-3 rounded-lg bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors">Publish rating</button>
            </>}
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Book Your Car Service?</h2>
          <p className="text-red-100 mb-2 text-lg">Join 5,000+ satisfied customers in Mumbai. Book online in under 2 minutes.</p>
          <p className="text-red-200 text-sm mb-8">Mumbai, Maharashtra</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg">
              <Calendar className="w-5 h-5" />
              Book a Service Now
            </Link>
            <a href="tel:629182859"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-red-700 text-white font-semibold rounded-xl hover:bg-red-800 transition-all border border-red-500">
              <Phone className="w-5 h-5" />
              Call Now: 629182859
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
