package com.example.clockin.util;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DateUtil {

    /**
     * 返回"有效今天"：凌晨 4:00 前视为前一天。
     * 例如 6/9 03:00 → 6/8，6/9 04:00 → 6/9。
     */
    public static LocalDate getEffectiveToday() {
        LocalDateTime now = LocalDateTime.now();
        return now.getHour() < 4 ? now.toLocalDate().minusDays(1) : now.toLocalDate();
    }

    public static LocalDate getEffectiveDate(LocalDateTime dateTime) {
        return dateTime.getHour() < 4 ? dateTime.toLocalDate().minusDays(1) : dateTime.toLocalDate();
    }
}
