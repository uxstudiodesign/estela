import { useNavigate } from 'react-router-dom'

const phases = [
  {
    number: 2,
    title: 'Notifications & Communication',
    description: 'Real-time updates and streamlined team communication',
    features: [
      'Push notifications for new pickups and deliveries',
      'In-app messaging between couriers and admin',
      'Daily summary email reports',
      'Boat crew delivery alerts',
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Carrier Integrations',
    description: 'Automatic tracking from major shipping carriers',
    features: [
      'DHL, FedEx, UPS, TNT tracking integration',
      'Auto-populate parcel details from tracking number',
      'Carrier delivery estimates',
      'Multi-leg shipment tracking',
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Operational Optimization',
    description: 'Analytics and smart routing for maximum efficiency',
    features: [
      'Route optimization for multi-stop deliveries',
      'Performance dashboards and KPIs',
      'Peak time analysis and resource planning',
      'Predictive delivery time estimates',
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    number: 5,
    title: 'Billing & Client Management',
    description: 'Invoicing, client portals, and financial tools',
    features: [
      'Automated delivery-based invoicing',
      'Client self-service portal',
      'Delivery cost calculations',
      'Monthly billing reports and exports',
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
] as const

export function ComingSoonPage() {
  const navigate = useNavigate()

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-surface-dark transition-colors"
        >
          <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">Roadmap</h1>
          <p className="text-sm text-text-light">What's coming next for Estela OS</p>
        </div>
      </div>

      {/* Current phase indicator */}
      <div className="bg-navy/5 border border-navy/20 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-navy text-white">
            Phase 1
          </span>
          <span className="text-xs text-text-light">Current</span>
        </div>
        <p className="text-text font-semibold">Core POD System</p>
        <p className="text-sm text-text-light">
          Barcode scanning, photo capture, GPS tracking, admin dashboard
        </p>
      </div>

      {/* Future phases */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-dark" />

        <div className="space-y-6">
          {phases.map((phase) => (
            <div key={phase.number} className="relative pl-14">
              <div className="absolute left-3.5 top-4 w-5 h-5 rounded-full bg-surface-dark border-2 border-white flex items-center justify-center">
                <span className="text-[9px] font-bold text-text-light">{phase.number}</span>
              </div>

              <div className="bg-white rounded-xl border border-surface-dark p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-surface text-navy flex-shrink-0">
                    {phase.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text">{phase.title}</h3>
                    <p className="text-sm text-text-light">{phase.description}</p>
                  </div>
                </div>

                <ul className="space-y-1.5">
                  {phase.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-text-light">
                      <svg className="w-4 h-4 mt-0.5 text-surface-dark flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
