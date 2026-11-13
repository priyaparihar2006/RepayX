import React, { useState, useEffect, useRef } from 'react';
import { Users, BellRing, CheckCircle, IndianRupee, TrendingUp, Sparkles } from 'lucide-react';

interface MetricItem {
  id: string;
  label: string;
  targetValue: number;
  prefix?: string;
  suffix?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
}

export const StatsSection: React.FC = () => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const metrics: MetricItem[] = [
    {
      id: 'customers',
      label: 'Customers Managed',
      targetValue: 61503,
      suffix: '+',
      description: 'Active loan accounts scored and categorized for delinquency',
      icon: Users,
      trend: '+14% MoM Scale',
    },
    {
      id: 'reminders',
      label: 'Active Reminders',
      targetValue: 2450,
      suffix: '+',
      description: 'Omnichannel multi-touch nudges dispatched on schedule',
      icon: BellRing,
      trend: 'Real-Time Automation',
    },
    {
      id: 'delivery-rate',
      label: 'Delivery Rate',
      targetValue: 98,
      suffix: '%',
      description: 'Carrier-verified inbox & handset delivery across channels',
      icon: CheckCircle,
      trend: '99.9% WhatsApp Uptime',
    },
    {
      id: 'amount-recovered',
      label: 'Amount Recovered',
      targetValue: 12.5,
      prefix: '₹',
      suffix: 'L+',
      description: 'Directly collected through automated conversational nudges',
      icon: IndianRupee,
      trend: '3.4x ROI vs Manual Callers',
    },
  ];

  // Animated counters
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    customers: 0,
    reminders: 0,
    'delivery-rate': 0,
    'amount-recovered': 0,
  });

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setHasAnimated(true);
      setCounts({
        customers: 61503,
        reminders: 2450,
        'delivery-rate': 98,
        'amount-recovered': 12.5,
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          // Animate counters over 1.6s
          const duration = 1600;
          const steps = 40;
          const stepTime = duration / steps;
          let currentStep = 0;

          const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeOutProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out

            setCounts({
              customers: Math.floor(61503 * easeOutProgress),
              reminders: Math.floor(2450 * easeOutProgress),
              'delivery-rate': Math.floor(98 * easeOutProgress),
              'amount-recovered': Number((12.5 * easeOutProgress).toFixed(1)),
            });

            if (currentStep >= steps) {
              clearInterval(timer);
              setCounts({
                customers: 61503,
                reminders: 2450,
                'delivery-rate': 98,
                'amount-recovered': 12.5,
              });
            }
          }, stepTime);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const formatDisplayValue = (metric: MetricItem, count: number) => {
    let formatted = count.toLocaleString('en-IN');
    if (metric.id === 'amount-recovered') {
      formatted = count.toFixed(1);
    }
    return `${metric.prefix ?? ''}${formatted}${metric.suffix ?? ''}`;
  };

  return (
    <section
      ref={sectionRef}
      className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      aria-label="Platform Statistics"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className="group relative bg-[#142630]/95 border border-white/10 hover:border-[#5DE5A1]/40 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#168653]/30 border border-[#5DE5A1]/20 flex items-center justify-center text-[#5DE5A1] group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#5DE5A1]">
                  {metric.trend}
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight mb-1 tabular-nums">
                {formatDisplayValue(metric, counts[metric.id] ?? 0)}
              </div>

              <div className="text-xs font-semibold text-slate-200 mb-1">
                {metric.label}
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2">
                {metric.description}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        Illustrative performance metrics based on the RepayX portfolio recovery benchmarks.
      </p>
    </section>
  );
};
