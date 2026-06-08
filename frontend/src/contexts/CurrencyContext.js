import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { currencyAPI } from '../lib/api';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export const CurrencyProvider = ({ children }) => {
    const [currencies, setCurrencies] = useState([]);
    const [referenceCurrency, setReferenceCurrency] = useState(null);
    const [sellingCurrency, setSellingCurrency] = useState(null);
    const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuth();

    // Load currencies when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadCurrencies();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const loadCurrencies = async () => {
        try {
            setLoading(true);
            const [allRes, activeRes] = await Promise.all([
                currencyAPI.getAll(),
                currencyAPI.getActive()
            ]);
            
            setCurrencies(allRes.data || []);
            setReferenceCurrency(activeRes.data?.reference || null);
            setSellingCurrency(activeRes.data?.selling || null);
            
            // Default payment currency to selling currency
            if (activeRes.data?.selling) {
                setSelectedPaymentCurrency(activeRes.data.selling);
            } else if (activeRes.data?.reference) {
                setSelectedPaymentCurrency(activeRes.data.reference);
            }
        } catch (err) {
            console.error('Failed to load currencies:', err);
        } finally {
            setLoading(false);
        }
    };

    // Convert price from reference to selling currency
    const convertToSelling = useCallback((priceInReference) => {
        if (!referenceCurrency || !sellingCurrency) return priceInReference;
        if (referenceCurrency.code === sellingCurrency.code) return priceInReference;
        
        // Convert: priceInReference / reference_rate * selling_rate
        // If reference is USD (rate=1) and selling is CDF (rate=2750)
        // Price 10 USD = 10 / 1 * 2750 = 27500 CDF
        return priceInReference * sellingCurrency.exchange_rate / referenceCurrency.exchange_rate;
    }, [referenceCurrency, sellingCurrency]);

    // Convert price from selling to reference currency
    const convertToReference = useCallback((priceInSelling) => {
        if (!referenceCurrency || !sellingCurrency) return priceInSelling;
        if (referenceCurrency.code === sellingCurrency.code) return priceInSelling;
        
        return priceInSelling * referenceCurrency.exchange_rate / sellingCurrency.exchange_rate;
    }, [referenceCurrency, sellingCurrency]);

    // Convert between any two currencies
    const convert = useCallback((amount, fromCode, toCode) => {
        if (fromCode === toCode) return amount;
        
        const fromCurrency = currencies.find(c => c.code === fromCode);
        const toCurrency = currencies.find(c => c.code === toCode);
        
        if (!fromCurrency || !toCurrency) return amount;
        
        // Convert via reference rate
        return amount * toCurrency.exchange_rate / fromCurrency.exchange_rate;
    }, [currencies]);

    // Format price with currency symbol (for display in any currency)
    const formatPrice = useCallback((amount, currency = null) => {
        const curr = currency || sellingCurrency || referenceCurrency;
        if (!curr) {
            return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
        }
        
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: curr.decimal_places || 0,
            maximumFractionDigits: curr.decimal_places || 0,
        }).format(amount);
        
        return `${formatted} ${curr.symbol}`;
    }, [sellingCurrency, referenceCurrency]);

    // Format price in reference currency
    const formatPriceReference = useCallback((amount) => {
        return formatPrice(amount, referenceCurrency);
    }, [formatPrice, referenceCurrency]);

    // Format price in selling currency (prices are already stored in selling currency)
    // No conversion needed - just format with the selling currency symbol
    const formatPriceSelling = useCallback((amount) => {
        return formatPrice(amount, sellingCurrency);
    }, [formatPrice, sellingCurrency]);

    // Get display price - prices are already in selling currency, no conversion needed
    const getDisplayPrice = useCallback((price) => {
        return price;
    }, []);

    // Convert price for payment in a different currency
    // If paying in reference currency, need to convert from selling price
    const getPriceForPayment = useCallback((priceInSelling, paymentCurrency) => {
        if (!paymentCurrency || !sellingCurrency) return priceInSelling;
        
        if (paymentCurrency.code === sellingCurrency.code) {
            return priceInSelling;
        }
        
        // Convert from selling to payment currency
        return convert(priceInSelling, sellingCurrency.code, paymentCurrency.code);
    }, [convert, sellingCurrency]);

    // Convert from selling currency to reference currency for storage
    const convertSellingToReference = useCallback((priceInSelling) => {
        if (!referenceCurrency || !sellingCurrency) return priceInSelling;
        if (referenceCurrency.code === sellingCurrency.code) return priceInSelling;
        
        return priceInSelling * referenceCurrency.exchange_rate / sellingCurrency.exchange_rate;
    }, [referenceCurrency, sellingCurrency]);

    const value = {
        currencies,
        referenceCurrency,
        sellingCurrency,
        selectedPaymentCurrency,
        setSelectedPaymentCurrency,
        loading,
        loadCurrencies,
        convertToSelling,
        convertToReference,
        convertSellingToReference,
        convert,
        formatPrice,
        formatPriceReference,
        formatPriceSelling,
        getDisplayPrice,
        getPriceForPayment,
        // Available payment currencies (reference + selling)
        paymentCurrencies: [referenceCurrency, sellingCurrency].filter(Boolean).filter((c, i, arr) => 
            arr.findIndex(x => x?.code === c?.code) === i
        ),
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};
