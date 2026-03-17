import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { currencyAPI } from '../lib/api';

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

    // Load currencies on mount
    useEffect(() => {
        loadCurrencies();
    }, []);

    const loadCurrencies = async () => {
        try {
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
        
        // Price in reference * selling rate / reference rate
        return priceInReference * (sellingCurrency.exchange_rate / referenceCurrency.exchange_rate);
    }, [referenceCurrency, sellingCurrency]);

    // Convert price from selling to reference currency
    const convertToReference = useCallback((priceInSelling) => {
        if (!referenceCurrency || !sellingCurrency) return priceInSelling;
        if (referenceCurrency.code === sellingCurrency.code) return priceInSelling;
        
        return priceInSelling * (referenceCurrency.exchange_rate / sellingCurrency.exchange_rate);
    }, [referenceCurrency, sellingCurrency]);

    // Convert between any two currencies
    const convert = useCallback((amount, fromCode, toCode) => {
        if (fromCode === toCode) return amount;
        
        const fromCurrency = currencies.find(c => c.code === fromCode);
        const toCurrency = currencies.find(c => c.code === toCode);
        
        if (!fromCurrency || !toCurrency) return amount;
        
        // Convert to reference first, then to target
        const inReference = amount / fromCurrency.exchange_rate;
        return inReference * toCurrency.exchange_rate;
    }, [currencies]);

    // Format price with currency symbol
    const formatPrice = useCallback((amount, currency = null) => {
        const curr = currency || sellingCurrency || referenceCurrency;
        if (!curr) {
            return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
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

    // Format price in selling currency (converts from reference)
    const formatPriceSelling = useCallback((amountInReference) => {
        const converted = convertToSelling(amountInReference);
        return formatPrice(converted, sellingCurrency);
    }, [convertToSelling, formatPrice, sellingCurrency]);

    // Get display price (in selling currency from reference amount)
    const getDisplayPrice = useCallback((priceInReference) => {
        return convertToSelling(priceInReference);
    }, [convertToSelling]);

    // Get price for payment (convert if needed)
    const getPriceForPayment = useCallback((priceInReference, paymentCurrency) => {
        if (!paymentCurrency) return priceInReference;
        
        if (paymentCurrency.code === referenceCurrency?.code) {
            return priceInReference;
        }
        
        return convert(priceInReference, referenceCurrency?.code, paymentCurrency.code);
    }, [convert, referenceCurrency]);

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
