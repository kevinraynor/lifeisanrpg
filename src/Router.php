<?php

class Router
{
    private array $routes = [];
    private array $middleware = [];

    /**
     * Register a route.
     */
    public function add(string $method, string $pattern, callable $handler, array $middleware = []): self
    {
        $this->routes[] = [
            'method'     => strtoupper($method),
            'pattern'    => $pattern,
            'handler'    => $handler,
            'middleware'  => $middleware,
        ];
        return $this;
    }

    public function get(string $pattern, callable $handler, array $middleware = []): self
    {
        return $this->add('GET', $pattern, $handler, $middleware);
    }

    public function post(string $pattern, callable $handler, array $middleware = []): self
    {
        return $this->add('POST', $pattern, $handler, $middleware);
    }

    public function put(string $pattern, callable $handler, array $middleware = []): self
    {
        return $this->add('PUT', $pattern, $handler, $middleware);
    }

    public function delete(string $pattern, callable $handler, array $middleware = []): self
    {
        return $this->add('DELETE', $pattern, $handler, $middleware);
    }

    /**
     * Register global middleware.
     */
    public function use(callable $middleware): self
    {
        $this->middleware[] = $middleware;
        return $this;
    }

    /**
     * Dispatch the current request.
     */
    public function dispatch(string $method, string $uri): void
    {
        // Strip query string
        $uri = strtok($uri, '?');
        // Remove trailing slash (except for root)
        if ($uri !== '/') {
            $uri = rtrim($uri, '/');
        }

        $method = strtoupper($method);

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->matchRoute($route['pattern'], $uri);
            if ($params !== false) {
                // Run global middleware
                foreach ($this->middleware as $mw) {
                    $mw();
                }
                // Run route-specific middleware
                foreach ($route['middleware'] as $mw) {
                    $mw();
                }
                // Call handler with extracted parameters
                call_user_func_array($route['handler'], $params);
                return;
            }
        }

        // No route matched
        http_response_code(404);
        if (str_starts_with($uri, '/api/')) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Not found']);
        } else {
            echo '404 - Page Not Found';
        }
    }

    /**
     * Match a route pattern against a URI.
     * Supports {param} placeholders and wildcard (*) at the end.
     * Returns array of extracted params on match, false on no match.
     */
    private function matchRoute(string $pattern, string $uri): array|false
    {
        // Exact match
        if ($pattern === $uri) {
            return [];
        }

        // Convert pattern to regex
        // {param} -> named capture group
        $regex = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $pattern);
        // Wildcard at end: /app/* matches /app and /app/anything
        if (str_ends_with($regex, '/*')) {
            $regex = substr($regex, 0, -2) . '(?:/.*)?';
        }

        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $uri, $matches)) {
            // Return only named matches (route params)
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[] = $value;
                }
            }
            return $params;
        }

        return false;
    }
}
