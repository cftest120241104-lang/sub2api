package routes

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/gin-gonic/gin"
)

var gameServiceProxyClient = &http.Client{Timeout: 30 * time.Second}

func registerGameServiceProxyRoutes(admin *gin.RouterGroup, cfg *config.Config) {
	proxy := admin.Group("/game-service")
	{
		proxy.Any("", func(c *gin.Context) {
			proxyGameService(c, cfg)
		})
		proxy.Any("/*path", func(c *gin.Context) {
			proxyGameService(c, cfg)
		})
	}
}

func proxyGameService(c *gin.Context, cfg *config.Config) {
	if cfg == nil || strings.TrimSpace(cfg.GameService.BaseURL) == "" {
		response.Error(c, http.StatusServiceUnavailable, "game service base url is not configured")
		return
	}
	if strings.TrimSpace(cfg.GameService.AdminAPIKey) == "" {
		response.Error(c, http.StatusServiceUnavailable, "game service admin api key is not configured")
		return
	}

	targetURL := buildGameServiceProxyURL(cfg.GameService.BaseURL, c.Param("path"), c.Request.URL.RawQuery)
	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, targetURL, c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadGateway, "failed to build game service request")
		return
	}
	copyProxyRequestHeaders(req.Header, c.Request.Header)
	req.Header.Set("x-game-service-admin-key", cfg.GameService.AdminAPIKey)

	resp, err := gameServiceProxyClient.Do(req)
	if err != nil {
		response.Error(c, http.StatusBadGateway, "game service request failed")
		return
	}
	defer resp.Body.Close()

	copyProxyResponseHeaders(c.Writer.Header(), resp.Header)
	c.Status(resp.StatusCode)
	_, _ = io.Copy(c.Writer, resp.Body)
}

func buildGameServiceProxyURL(baseURL string, path string, rawQuery string) string {
	target := strings.TrimRight(baseURL, "/")
	if path != "" {
		target += "/" + strings.TrimLeft(path, "/")
	}
	if rawQuery != "" {
		target += "?" + rawQuery
	}
	return target
}

func copyProxyRequestHeaders(dst http.Header, src http.Header) {
	for key, values := range src {
		if isBlockedProxyHeader(key) || strings.EqualFold(key, "Authorization") || strings.EqualFold(key, "Cookie") ||
			strings.EqualFold(key, "X-Api-Key") || strings.EqualFold(key, "X-Admin-Api-Key") ||
			strings.EqualFold(key, "X-Game-Service-Admin-Key") {
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}

func copyProxyResponseHeaders(dst http.Header, src http.Header) {
	for key, values := range src {
		if isBlockedProxyHeader(key) {
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}

func isBlockedProxyHeader(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade":
		return true
	default:
		return false
	}
}
