package com.example.clockin.common;

import lombok.Getter;

/**
 * 统一 API 响应封装。
 *
 * 设计目标：前端只需要面对一种 JSON 结构 —— { code, message, data }。
 * 无论哪个 Controller、无论成功还是失败，返回格式完全一致。
 *
 * 前端 axios 响应拦截器（api/client.ts）依赖这个约定，
 * 自动从响应中解包出 data 字段，调用方拿到的就是业务数据本身。
 *
 * @param <T> data 字段的实际类型（Task、Goal、List 等）
 */
@Getter
public class ApiResponse<T> {

    /** HTTP 状态码语义：200 成功，400 参数错误，404 资源不存在，500 服务器错误 */
    private int code;

    /** 人类可读的提示信息 */
    private String message;

    /** 响应携带的业务数据，出错时为 null */
    private T data;

    /**
     * 构造函数私有 —— 不允许外部随意 new，强制通过工厂方法创建。
     * 这样 code 和 message 的生成规则集中在三个工厂方法里，不会散落各处。
     */
    private ApiResponse(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /** 成功响应，携带数据（查询、创建、更新等） */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "success", data);
    }

    /** 成功响应，无需返回数据（删除操作等） */
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(200, "success", null);
    }

    /** 失败响应 —— 由 GlobalExceptionHandler 统一调用，Controller 代码中不应直接使用 */
    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
