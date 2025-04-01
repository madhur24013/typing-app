import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { subscriptionAPI } from '../../services/api';
import Button from '../common/Button';
import GlassCard from '../common/GlassCard';

const PricingPlans = () => {
  const [pricingData, setPricingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [currentPlan, setCurrentPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        setIsLoading(true);
        const response = await subscriptionAPI.getSubscriptionTiers();
        setPricingData(response.data);
        
        // Also get current subscription if user is logged in
        try {
          const userSubResponse = await subscriptionAPI.getUserSubscription();
          setCurrentPlan(userSubResponse.data.tier);
        } catch (error) {
          // User might not be logged in yet, that's OK
          console.log('User not logged in or subscription not available');
        }
      } catch (error) {
        console.error('Error fetching pricing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricingData();
  }, []);

  const handleSubscribe = async (tier) => {
    try {
      // If not logged in, redirect to login page
      if (!localStorage.getItem('token')) {
        navigate('/login', { state: { redirect: '/pricing' } });
        return;
      }
      
      // If user is already on this plan, redirect to account page
      if (currentPlan === tier) {
        navigate('/account');
        return;
      }
      
      // Create checkout session
      const response = await subscriptionAPI.createCheckoutSession({
        tier,
        billingType: billingCycle
      });
      
      // If it's enterprise, redirect to contact page
      if (response.data.redirectUrl) {
        navigate(response.data.redirectUrl);
        return;
      }
      
      // Redirect to Stripe checkout if available
      if (response.data.sessionId) {
        const stripe = window.Stripe(process.env.STRIPE_PUBLIC_KEY);
        await stripe.redirectToCheckout({
          sessionId: response.data.sessionId
        });
      }
    } catch (error) {
      console.error('Error initiating subscription:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 mb-4 border-t-4 border-b-4 border-primary-500 rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading pricing plans...</p>
      </div>
    );
  }

  // Extract the tier data for easier rendering
  const tiers = pricingData?.tiers || {};
  const tierConstants = pricingData?.constants || {};

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text"
        >
          Choose Your Plan
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
        >
          Unlock your full typing potential with our flexible subscription options
        </motion.p>
        
        {/* Billing cycle toggle */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-full"
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Yearly
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Save 20%
            </span>
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Object.entries(tiers).map(([key, tier], index) => {
          // Skip enterprise plan for normal display
          if (key === tierConstants.ENTERPRISE) {
            return null;
          }
          
          // Select correct price based on billing cycle
          const price = billingCycle === 'yearly' && tier.yearlyPrice ? tier.yearlyPrice : tier.price;
          
          // Check if this is the user's current plan
          const isCurrentPlan = currentPlan === key;
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              className={`flex flex-col ${tier.popular ? 'lg:-mt-8' : ''}`}
            >
              <GlassCard 
                className={`h-full flex flex-col ${
                  tier.popular 
                    ? 'border-blue-500 dark:border-blue-600 ring-4 ring-blue-500/20 dark:ring-blue-600/20' 
                    : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-5 left-0 right-0 flex justify-center">
                    <span className="px-4 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-6 flex-grow">
                  <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{tier.name}</h3>
                  
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price !== 0 && price !== 'Custom' && (
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  
                  <ul className="mt-6 space-y-4">
                    <FeatureItem 
                      feature={`${tier.features.maxDocuments === 'unlimited' ? 'Unlimited' : tier.features.maxDocuments} documents`}
                      available={true}
                    />
                    <FeatureItem 
                      feature="Real-time typing analysis"
                      available={true}
                    />
                    <FeatureItem 
                      feature="Ad-free experience"
                      available={!tier.features.adsEnabled}
                    />
                    <FeatureItem 
                      feature="Custom themes"
                      available={tier.features.customThemes}
                    />
                    <FeatureItem 
                      feature="Premium courses"
                      available={tier.features.premiumCourses}
                    />
                    <FeatureItem 
                      feature="Offline access"
                      available={tier.features.offlineAccess}
                    />
                    <FeatureItem 
                      feature="Advanced analytics"
                      available={tier.features.analyticsLevel !== 'basic'}
                    />
                    <FeatureItem 
                      feature="API access"
                      available={tier.features.apiAccess}
                    />
                    {tier.features.teamMembers > 0 && (
                      <FeatureItem 
                        feature={`${tier.features.teamMembers === 'unlimited' ? 'Unlimited' : tier.features.teamMembers} team members`}
                        available={true}
                      />
                    )}
                  </ul>
                </div>
                
                <div className="p-6 pt-0">
                  <Button
                    variant={tier.popular ? 'primary' : isCurrentPlan ? 'success' : 'secondary'}
                    className="w-full"
                    onClick={() => handleSubscribe(key)}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Get Started'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
        
        {/* Enterprise Plan */}
        {tiers[tierConstants.ENTERPRISE] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="col-span-1 md:col-span-2 lg:col-span-4"
          >
            <GlassCard className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Enterprise Plan</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Need a custom solution for your organization? Our enterprise plan offers tailored features, 
                    dedicated support, and custom integration options.
                  </p>
                  <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                    <FeatureItem feature="Unlimited documents" available={true} />
                    <FeatureItem feature="Unlimited team members" available={true} />
                    <FeatureItem feature="Dedicated support" available={true} />
                    <FeatureItem feature="Custom branding" available={true} />
                    <FeatureItem feature="Advanced analytics" available={true} />
                    <FeatureItem feature="API access" available={true} />
                    <FeatureItem feature="SSO integration" available={true} />
                    <FeatureItem feature="Advanced security" available={true} />
                  </ul>
                </div>
                <div className="flex flex-col justify-center items-center text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Custom Pricing</div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/contact-sales')}
                  >
                    Contact Sales
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All plans include a 14-day money-back guarantee. No questions asked.
        </p>
      </div>
    </div>
  );
};

// Helper component for rendering feature items
const FeatureItem = ({ feature, available }) => (
  <li className="flex items-start">
    <div className="shrink-0 flex items-center justify-center w-5 h-5 mt-1">
      {available ? (
        <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
    <span className={`ml-2 text-sm ${
      available 
        ? 'text-gray-700 dark:text-gray-300' 
        : 'text-gray-400 dark:text-gray-500'
    }`}>
      {feature}
    </span>
  </li>
);

export default PricingPlans; 