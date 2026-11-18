package com.uasz.ms_reservation.security;

public class SecurityUserContextHolder {

    private static final ThreadLocal<SecurityUserContext> CONTEXT = new ThreadLocal<>();

    public static void setContext(SecurityUserContext context) {
        CONTEXT.set(context);
    }

    public static SecurityUserContext getContext() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
