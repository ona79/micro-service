package com.uasz.ms_notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageResponseDto {
    private List<NotificationDto> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
    private long unreadCount;
}
