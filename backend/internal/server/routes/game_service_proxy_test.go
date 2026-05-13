package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGameServiceProxyForwardsPathQueryBodyAndServerAdminKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/admin/ops/rtp-control", r.URL.Path)
		require.Equal(t, "game=vs10jokerhot", r.URL.RawQuery)
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "server-admin-key", r.Header.Get("x-game-service-admin-key"))
		require.Empty(t, r.Header.Get("Authorization"))
		require.Empty(t, r.Header.Get("Cookie"))
		require.Empty(t, r.Header.Get("x-api-key"))
		require.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var payload map[string]string
		require.NoError(t, json.NewDecoder(r.Body).Decode(&payload))
		require.Equal(t, "qa", payload["source"])

		w.Header().Set("X-Upstream-Trace", "trace-1")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	t.Cleanup(upstream.Close)

	router := gin.New()
	admin := router.Group("/api/v1/admin")
	registerGameServiceProxyRoutes(admin, &config.Config{
		GameService: config.GameServiceConfig{
			BaseURL:     upstream.URL,
			AdminAPIKey: "server-admin-key",
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/game-service/admin/ops/rtp-control?game=vs10jokerhot", strings.NewReader(`{"source":"qa"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer browser-token")
	req.Header.Set("Cookie", "session=browser")
	req.Header.Set("x-api-key", "browser-admin-key")
	req.Header.Set("x-game-service-admin-key", "browser-game-service-key")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	require.Equal(t, "trace-1", w.Header().Get("X-Upstream-Trace"))
	require.JSONEq(t, `{"ok":true}`, w.Body.String())
}

func TestGameServiceProxyRequiresConfiguration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	admin := router.Group("/api/v1/admin")
	registerGameServiceProxyRoutes(admin, &config.Config{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/game-service/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusServiceUnavailable, w.Code)
	require.Contains(t, w.Body.String(), "game service base url is not configured")
}
