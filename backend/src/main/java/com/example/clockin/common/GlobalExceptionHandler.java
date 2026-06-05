package com.example.clockin.common;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * 全局异常处理 —— 所有 Controller 抛出的异常在此统一翻译为 ApiResponse。
 *
 * 设计目标：Controller 代码中不需要写任何 try-catch。
 * Service 层只管抛异常（EntityNotFoundException、IllegalArgumentException 等），
 * 这个类负责把异常类型映射为合适的 HTTP 状态码 + 错误信息。
 *
 * Spring 的匹配机制：按异常类型从具体到通用依次匹配。
 * 比如抛了 EntityNotFoundException，会命中 handleNotFound 而不是兜底的 handleGeneral。
 *
 * @RestControllerAdvice = @ControllerAdvice + @ResponseBody
 * 表示返回 JSON 而非视图页面（因为这是前后端分离项目，没有 JSP/Thymeleaf）。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 资源不存在 —— 通常是 findById 找不到时抛出。
     * 对应 HTTP 404。
     */
    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleNotFound(EntityNotFoundException e) {
        return ApiResponse.error(404, e.getMessage());
    }

    /**
     * 参数不合法 —— 业务逻辑层主动校验时抛出。
     * 对应 HTTP 400。
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleBadArgument(IllegalArgumentException e) {
        return ApiResponse.error(400, e.getMessage());
    }

    /**
     * 请求体校验失败 —— 当 DTO 字段上的 @Valid / @NotBlank 等注解校验不通过时，
     * Spring 自动抛出 MethodArgumentNotValidException。
     * 这里把所有字段错误拼接成一条可读信息："name: 不能为空; email: 格式不正确"
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ApiResponse.error(400, msg);
    }

    /**
     * 兜底处理器 —— 捕获所有未被上面匹配的异常。
     * 防止 NullPointerException 等未预料错误直接暴露堆栈给前端。
     * 对应 HTTP 500。
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleGeneral(Exception e) {
        return ApiResponse.error(500, "服务器内部错误: " + e.getMessage());
    }
}
