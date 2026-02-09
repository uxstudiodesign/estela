import { useParams, useNavigate } from 'react-router-dom'

const features: Record<string, { title: string; description: string; details: readonly string[] }> = {
  notifications: {
    title: 'Notifications & Communication',
    description: 'Real-time updates and streamlined team communication to keep everyone in sync — from couriers on the ground to admin at HQ.',
    details: [
      'Push notifications for new pickups and deliveries',
      'In-app messaging between couriers and admin',
      'Daily summary email reports with key metrics',
      'Boat crew delivery alerts when parcels are on the way',
      'Custom notification preferences per user',
    ],
  },
  integrations: {
    title: 'Carrier Integrations',
    description: 'Automatic tracking from major shipping carriers, eliminating manual data entry and providing real-time shipment visibility.',
    details: [
      'DHL, FedEx, UPS, TNT tracking integration',
      'Auto-populate parcel details from tracking number',
      'Carrier delivery estimates and ETAs',
      'Multi-leg shipment tracking across carriers',
      'Automatic status sync from carrier APIs',
    ],
  },
  analytics: {
    title: 'Operational Optimization',
    description: 'Analytics, smart routing, and performance dashboards to maximize courier efficiency and reduce delivery times across Palma.',
    details: [
      'Route optimization for multi-stop deliveries',
      'Performance dashboards and courier KPIs',
      'Peak time analysis and resource planning',
      'Predictive delivery time estimates',
      'Historical trends and seasonal patterns',
    ],
  },
  billing: {
    title: 'Billing & Client Management',
    description: 'Automated invoicing, client self-service portals, and financial reporting — turning delivery data into revenue insights.',
    details: [
      'Automated delivery-based invoicing per boat',
      'Client self-service portal for tracking parcels',
      'Delivery cost calculations and pricing rules',
      'Monthly billing reports and CSV/PDF exports',
      'Multi-currency support for international clients',
    ],
  },
}

export function FeatureComingSoonPage() {
  const { featureId } = useParams<{ featureId: string }>()
  const navigate = useNavigate()
  const feature = featureId ? features[featureId] : undefined

  if (!feature) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-light">Feature not found</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-lg hover:bg-surface-dark transition-colors"
        >
          <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text">{feature.title}</h1>
        </div>
      </div>

      {/* Coming Soon badge */}
      <div className="bg-warning/10 border border-warning/20 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">&#9203;</span>
          <div>
            <p className="font-semibold text-text">Coming Soon</p>
            <p className="text-sm text-text-light">This feature is on our roadmap and currently in development.</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-text-light mb-6 leading-relaxed">{feature.description}</p>

      {/* Planned features */}
      <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Planned Features</h2>
      <div className="bg-white rounded-xl border border-surface-dark divide-y divide-surface-dark">
        {feature.details.map((detail) => (
          <div key={detail} className="flex items-start gap-3 px-4 py-3">
            <svg className="w-5 h-5 mt-0.5 text-navy/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
            <p className="text-sm text-text">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
