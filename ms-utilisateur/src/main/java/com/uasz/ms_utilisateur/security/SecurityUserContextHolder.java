package com.uasz.ms_utilisateur.security;

public final class SecurityUserContextHolder {

    private static final ThreadLocal<SecurityUserContext> HOLDER = new ThreadLocal<>();

    private SecurityUserContextHolder() {
    }

    public static void setContext(SecurityUserContext context) {
        if (context == null) {
            HOLDER.remove();
        } else {
            HOLDER.set(context);
        }
    }

    public static SecurityUserContext getContext() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
