import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import { Award, Users, Shield, Target, Wrench, Heart, MapPin, Phone, Clock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="pt-16">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 opacity-25"
            style={{ backgroundImage: "url('https://images.pexels.com/photos/33814734/pexels-photo-33814734.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 to-gray-800/80" />
          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">Mumbai's Trusted<br />Car Service Workshop</h1>
            <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
              NMR Car Services was founded with a simple mission: make professional car servicing transparent, affordable, and convenient for every car owner in Mumbai.
            </p>
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm mt-4">
              <MapPin className="w-4 h-4" />
              Mumbai, Maharashtra
            </div>
          </div>
        </div>

        {/* Workshop Images */}
        <section className="py-12 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl overflow-hidden h-52 shadow-md">
                <img src="https://images.pexels.com/photos/17600886/pexels-photo-17600886.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="NMR Car Services interior" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="rounded-2xl overflow-hidden h-52 shadow-md">
                <img src="https://images.pexels.com/photos/37163499/pexels-photo-37163499.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="Service bay" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="rounded-2xl overflow-hidden h-52 shadow-md">
                <img src="https://images.pexels.com/photos/6870331/pexels-photo-6870331.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1" alt="Expert mechanics" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 bg-gray-50 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Mission</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  We believe every car owner in Mumbai deserves access to professional, transparent, and affordable car service.
                  Our mission is to bridge the gap between car owners and trusted mechanics using technology.
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  From online booking to real-time tracking, digital invoices to doorstep pickup in Mumbai and surrounding areas — we've reimagined the entire car service experience.
                </p>
                <div className="flex items-start gap-3 mt-6 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <MapPin className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Visit Us</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Mumbai, Maharashtra</p>
                    <a href="tel:629182859" className="text-red-600 dark:text-red-400 text-sm font-medium mt-1 inline-block hover:underline">629182859</a>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '2020', label: 'Established', icon: <Target className="w-6 h-6" /> },
                  { value: '5K+', label: 'Customers', icon: <Users className="w-6 h-6" /> },
                  { value: '15+', label: 'Mechanics', icon: <Wrench className="w-6 h-6" /> },
                  { value: '20K+', label: 'Services', icon: <Award className="w-6 h-6" /> },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-gray-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 text-red-600 dark:text-red-400">
                      {s.icon}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">The principles that guide everything we do at NMR Car Services.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Shield className="w-6 h-6 text-blue-600" />, title: 'Integrity', desc: 'Transparent pricing and honest advice. We never recommend unnecessary services.' },
                { icon: <Award className="w-6 h-6 text-yellow-600" />, title: 'Quality', desc: 'Only genuine parts and industry best practices. No shortcuts, ever.' },
                { icon: <Heart className="w-6 h-6 text-red-600" />, title: 'Customer First', desc: 'Your satisfaction is our top priority. Every decision starts with the customer.' },
                { icon: <Target className="w-6 h-6 text-green-600" />, title: 'Innovation', desc: 'We continuously improve our technology to make your experience seamless.' },
                { icon: <Users className="w-6 h-6 text-purple-600" />, title: 'Community', desc: 'We invest in our mechanics and the Mumbai community we are proud to serve.' },
                { icon: <Wrench className="w-6 h-6 text-orange-600" />, title: 'Expertise', desc: 'All mechanics are certified with minimum 3 years of hands-on experience.' },
              ].map(v => (
                <div key={v.title} className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                  <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-600">
                    {v.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{v.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 bg-gray-50 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Meet Our Expert Team</h2>
              <p className="text-gray-500 dark:text-gray-400">Experienced, certified, and passionate about cars.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Amit Banerjee', role: 'Owner & Chief Mechanic', img: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1', init: 'A' },
                { name: 'Rajesh Mondal', role: 'Senior Technician', img: 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1', init: 'R' },
                { name: 'Subhash Kumar', role: 'AC & Electricals', img: 'https://images.pexels.com/photos/6870300/pexels-photo-6870300.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1', init: 'S' },
                { name: 'Puja Sharma', role: 'Customer Relations', img: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1', init: 'P' },
              ].map(person => (
                <div key={person.name} className="text-center group">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden mx-auto mb-4 shadow-md group-hover:shadow-lg transition-shadow border-4 border-white dark:border-slate-700">
                    <img src={person.img} alt={person.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{person.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{person.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="py-16 bg-white dark:bg-slate-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Where to Find Us</h2>
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-lg h-64 mb-6">
              <iframe
                title="NMR Car Services Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.1244!2d72.8777!3d19.0760!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMumbai%2C+Maharashtra!5e0!3m2!1sen!2sin!4v1600000000000"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: <MapPin className="w-5 h-5 text-red-600" />, label: 'Address', value: 'Mumbai, Maharashtra' },
                { icon: <Phone className="w-5 h-5 text-red-600" />, label: 'Phone', value: '629182859' },
                { icon: <Clock className="w-5 h-5 text-red-600" />, label: 'Hours', value: 'Mon–Sat: 8AM–8PM\nSun: 9AM–5PM' },
              ].map(c => (
                <div key={c.label} className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-5 text-center border border-gray-100 dark:border-slate-700">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">{c.icon}</div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{c.label}</p>
                  {c.value.split('\n').map((line, i) => <p key={i} className="text-gray-500 dark:text-gray-400 text-sm">{line}</p>)}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <PublicFooter />
    </div>
  );
}
