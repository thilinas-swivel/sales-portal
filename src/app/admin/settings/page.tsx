'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Check, DollarSign, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  // Tier settings state
  const [tierSettings, setTierSettings] = useState({
    deal_enterprise: 100000,
    deal_mid_market: 25000,
    deal_smb: 5000,
    rev_enterprise: 50000000,
    rev_mid_market: 10000000,
    rev_smb: 1000000,
  });
  const [tierLoading, setTierLoading] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);

  // Fetch tier settings on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTierLoading(true);
    fetch('/api/settings/tiers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setTierSettings({
            deal_enterprise: Number(json.data.deal_enterprise) || 100000,
            deal_mid_market: Number(json.data.deal_mid_market) || 25000,
            deal_smb: Number(json.data.deal_smb) || 5000,
            rev_enterprise: Number(json.data.rev_enterprise) || 50000000,
            rev_mid_market: Number(json.data.rev_mid_market) || 10000000,
            rev_smb: Number(json.data.rev_smb) || 1000000,
          });
        }
      })
      .catch(() => {})
      .finally(() => setTierLoading(false));
  }, []);

  const handleSaveTiers = useCallback(async () => {
    setTierSaving(true);
    try {
      const res = await fetch('/api/settings/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierSettings),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setTierSaving(false);
  }, [tierSettings]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
          Configure spending capacity tier thresholds
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Spending Capacity Tiers
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure the thresholds used to classify companies into tiers. Revenue thresholds are
          used when the organization has a revenue field in Pipedrive; otherwise deal value
          thresholds apply.
        </p>

        {tierLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Deal Value Thresholds */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Deal Value Thresholds
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Fallback when org revenue is unavailable
              </p>
              <div className="space-y-4">
                {[
                  {
                    key: 'deal_enterprise' as const,
                    label: 'Enterprise',
                    color: 'border-purple-300 dark:border-purple-700',
                  },
                  {
                    key: 'deal_mid_market' as const,
                    label: 'Mid-Market',
                    color: 'border-blue-300 dark:border-blue-700',
                  },
                  {
                    key: 'deal_smb' as const,
                    label: 'SMB',
                    color: 'border-teal-300 dark:border-teal-700',
                  },
                ].map(({ key, label, color }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {label} (min total deal value)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={tierSettings[key]}
                        onChange={(e) =>
                          setTierSettings((prev) => ({
                            ...prev,
                            [key]: Number(e.target.value) || 0,
                          }))
                        }
                        className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg border ${color} bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                  Micro = below SMB threshold
                </div>
              </div>
            </div>

            {/* Org Revenue Thresholds */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Organization Revenue Thresholds
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Used when org has a revenue custom field
              </p>
              <div className="space-y-4">
                {[
                  {
                    key: 'rev_enterprise' as const,
                    label: 'Enterprise',
                    color: 'border-purple-300 dark:border-purple-700',
                  },
                  {
                    key: 'rev_mid_market' as const,
                    label: 'Mid-Market',
                    color: 'border-blue-300 dark:border-blue-700',
                  },
                  {
                    key: 'rev_smb' as const,
                    label: 'SMB',
                    color: 'border-teal-300 dark:border-teal-700',
                  },
                ].map(({ key, label, color }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {label} (min annual revenue)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={tierSettings[key]}
                        onChange={(e) =>
                          setTierSettings((prev) => ({
                            ...prev,
                            [key]: Number(e.target.value) || 0,
                          }))
                        }
                        className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg border ${color} bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                  Micro = below SMB threshold
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSaveTiers}
            disabled={tierSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {tierSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
