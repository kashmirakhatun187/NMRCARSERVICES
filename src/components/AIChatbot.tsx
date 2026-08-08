import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2, Zap } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const getTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const aiResponses: Record<string, string> = {
  'service': "I can help you with our services! We offer Basic Service (₹1,499), Full Service (₹3,999), AC Service (₹1,999), Tyre Rotation (₹599), Car Wash (₹799), and more. Would you like to book a service?",
  'book': "To book a service, go to your Customer Dashboard → Book Service. You can select your vehicle, choose a service, pick a date & time, and even request pickup/drop. Shall I walk you through it?",
  'price': "Our pricing is transparent with no hidden charges:\n• Basic Service: ₹1,499\n• Full Service: ₹3,999\n• AC Service: ₹1,999\n• Car Wash: ₹799\n• Tyre Rotation: ₹599\n• Battery Check: ₹499\nAll prices include GST.",
  'pickup': "Yes! We offer doorstep pickup and drop service for ₹299 each way. You can select this option while booking. Our driver will collect your car and return it after service.",
  'track': "You can track your service in real-time from your Bookings page. The status updates from Pending → Confirmed → In Progress → Completed. We also send notifications at each stage.",
  'payment': "We accept UPI, Credit/Debit Cards, Net Banking, Wallet, and Cash on service. For orders above ₹5,000, EMI options are available.",
  'warranty': "We provide a 30-day warranty on all repair work and 6-month warranty on spare parts. You can track your warranties in the Warranty section of your dashboard.",
  'membership': "Our membership plans offer great savings!\n• Silver: ₹299/month – 10% off + 1 free service\n• Gold: ₹599/month – 20% off + free pickup/drop\n• Platinum: ₹999/month – 30% off + priority service\nCheck the Membership section for details.",
  'loyalty': "Every service earns you Loyalty Points! 1 point per ₹10 spent. Points can be redeemed for discounts on future services. Silver members get 1.5x points, Gold gets 2x!",
  'emergency': "For emergency breakdown, call our helpline: 629182859. You can also submit an Emergency Assistance request from your dashboard and we'll dispatch help immediately.",
  'oil': "Engine oil should be changed every 5,000-10,000 km (3-6 months) depending on your car model. We'll set up automatic reminders for you. Go to Service Reminders in your dashboard.",
  'amc': "Our Annual Maintenance Contracts start from ₹4,999/year and cover 2 basic services + additional checks. AMC ensures priority scheduling and discounts on parts. Visit Packages in your dashboard.",
  'hello': "Hello! I'm AutoBot, your NMR Car Services assistant. I can help you with:\n• Service bookings & pricing\n• Tracking your service\n• Membership & loyalty points\n• Emergency assistance\n• Car maintenance tips\n\nLocated at Mumbai, Maharashtra.\nWhat can I help you with today?",
  'hi': "Hi there! How can I assist you today? I'm here to help with all your car service needs!",
  'thanks': "You're welcome! If you have any more questions, feel free to ask. Drive safe! 🚗",
  'fuel': "Track your fuel expenses in the Fuel Tracker section of your dashboard. It helps you monitor fuel efficiency, total spending, and get insights on your car's mileage.",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(aiResponses)) {
    if (lower.includes(key)) return response;
  }

  if (lower.includes('cost') || lower.includes('how much') || lower.includes('rate')) return aiResponses['price'];
  if (lower.includes('ac') || lower.includes('air') || lower.includes('cool')) return "Our AC Service starts at ₹1,999 and includes gas refill, compressor check, and filter cleaning. Book it from your dashboard!";
  if (lower.includes('tyre') || lower.includes('tire') || lower.includes('wheel')) return "We offer Tyre Rotation & Balancing (₹599) and Wheel Alignment (₹699). Regular tyre maintenance every 10,000 km is recommended.";
  if (lower.includes('brake')) return "Brake inspection & repair starts at ₹2,499. Signs you need brake service: squealing noise, longer stopping distance, or brake light on dashboard. Book an inspection now!";
  if (lower.includes('battery')) return "Battery check costs ₹499 and takes just 30 minutes. Signs of a failing battery: slow engine crank, dim lights, or dashboard warning. Book a check today!";
  if (lower.includes('remind') || lower.includes('schedule')) return aiResponses['oil'];
  if (lower.includes('refund') || lower.includes('cancel')) return "For cancellations, please do so at least 2 hours before your scheduled time. Refunds are processed within 5-7 business days to your original payment method. For help, raise a support ticket.";
  if (lower.includes('mechanic') || lower.includes('technician')) return "All our mechanics are certified with minimum 3 years of experience. You can see the assigned mechanic in your Job Card once your service starts.";

  return "I understand you're asking about '" + input.slice(0, 30) + "'. For help, contact us at support@nmrcarservices.in or call 629182859. We're at Mumbai, Maharashtra!";
}

const quickReplies = ['Book a service', 'Service prices', 'Pickup & drop', 'Emergency help', 'Membership plans', 'Track my car'];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: "Hi! I'm AutoBot 🤖 Your AI-powered car care assistant. Ask me anything about services, bookings, pricing, or car maintenance tips!", time: getTime() }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, minimized]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, time: getTime() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: getAIResponse(content), time: getTime() };
    setMessages(prev => [...prev, aiMsg]);
    setTyping(false);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl shadow-red-600/40 flex items-center justify-center hover:bg-red-700 hover:scale-110 transition-all ${open ? 'hidden' : 'flex'}`}>
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse-slow" />
      </button>

      {/* Chat Window */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all ${minimized ? 'h-14' : 'h-[520px]'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">AutoBot AI</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <p className="text-red-200 text-xs">Online · Powered by AI</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-red-600 dark:text-red-400" /> : <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-red-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-gray-400">{msg.time}</span>
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div className="px-3 py-2 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {quickReplies.map(r => (
                    <button key={r} onClick={() => sendMessage(r)}
                      className="shrink-0 px-2.5 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap">
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-red-400 dark:focus:border-red-500"
                  placeholder="Ask anything..."
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || typing}
                  className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 disabled:opacity-40 transition-all shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
