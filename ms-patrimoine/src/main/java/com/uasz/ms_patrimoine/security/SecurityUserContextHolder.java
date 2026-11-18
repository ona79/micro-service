package com.uasz.ms_patrimoine.security;

public final class SecurityUserContextHolder {

    private static final ThreadLocal<SecurityUserContext> CONTEXT = new ThreadLocal<>();

    private SecurityUserContextHolder() {}

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
