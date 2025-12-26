import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Simple A/B testing for pricing and features
export function useABTest(testName, variants = ['A', 'B']) {
  const [variant, setVariant] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const assignVariant = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        setUserId(user.id);

        // Check if user already has a variant assigned
        const existingTests = await base44.entities.ABTest.filter({
          user_id: user.id,
          test_name: testName
        });

        if (existingTests.length > 0) {
          setVariant(existingTests[0].variant);
        } else {
          // Assign random variant
          const randomVariant = variants[Math.floor(Math.random() * variants.length)];
          
          await base44.entities.ABTest.create({
            user_id: user.id,
            test_name: testName,
            variant: randomVariant,
            assigned_at: new Date().toISOString()
          });

          setVariant(randomVariant);
        }
      } catch (e) {
        console.error('AB test error:', e);
        setVariant(variants[0]); // Default to first variant
      }
    };

    assignVariant();
  }, [testName]);

  const trackConversion = async (conversionType) => {
    if (!userId) return;

    try {
      await base44.entities.ProfileAnalytics.create({
        user_profile_id: userId,
        event_type: `ab_test_${testName}_${conversionType}`,
        event_data: {
          variant,
          test_name: testName,
          conversion_type: conversionType
        }
      });
    } catch (e) {
      console.error('Failed to track AB test conversion:', e);
    }
  };

  return { variant, trackConversion };
}

// Example: Price testing
export function usePricingTest() {
  const { variant, trackConversion } = useABTest('premium_pricing_2025', ['9.99', '12.99', '14.99']);
  
  return {
    price: variant,
    onPurchase: () => trackConversion('purchase'),
    onView: () => trackConversion('view')
  };
}