import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface RestaurantConfig {
    id: string;
    restaurant_name: string;
    tax_percentage: number;
    address: string | null;
    phone: string | null;
    currency: string;
    social_instagram: string | null;
    social_facebook: string | null;
    social_twitter: string | null;
    purchase_message: string | null;
    invoice_footer: string | null;
    invoice_paper_size?: string;
    invoice_font_size?: number;
    invoice_font_family?: string;
    invoice_primary_color?: string;
    invoice_show_social?: boolean;
    invoice_show_customer?: boolean;
    business_id?: string | null;
    invoice_template?: string;
    invoice_logo_url?: string | null;
    invoice_show_qr?: boolean;
}

interface ConfigContextType {
    config: RestaurantConfig | null;
    loading: boolean;
    refreshConfig: () => Promise<void>;
    updateConfig: (updates: Partial<RestaurantConfig>) => Promise<void>;
    formatMoney: (amount: number) => string;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<RestaurantConfig | null>(null);
    const [loading, setLoading] = useState(true);

    const loadConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('restaurant_config')
                .select('*')
                .maybeSingle() as any;

            if (error) throw error;
            if (data) {
                setConfig({
                    ...data,
                });
            }
        } catch (error) {
            console.error('Error loading config:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const refreshConfig = async () => {
        await loadConfig();
    };

    const updateConfig = async (updates: Partial<RestaurantConfig>) => {
        try {
            if (config?.id) {
                const { error } = await supabase
                    .from('restaurant_config')
                    .update(updates)
                    .eq('id', config.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('restaurant_config')
                    .insert(updates);

                if (error) throw error;
            }
            await loadConfig();
        } catch (error) {
            const message = error instanceof Error ? error.message : JSON.stringify(error);
            console.error('Error updating config:', message);
            throw error;
        }
    };

    const formatMoney = (amount: number) => {
        // Configuración para formato de dinero
        const options: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: 'DOP', // Moneda por defecto para República Dominicana
            minimumFractionDigits: 2,
        };

        // Formato específico para RD$
        return new Intl.NumberFormat('es-DO', options).format(amount);
    };

    return (
        <ConfigContext.Provider value={{ config, loading, refreshConfig, updateConfig, formatMoney }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}
