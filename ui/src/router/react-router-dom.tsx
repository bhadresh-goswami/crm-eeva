/* eslint-disable react-refresh/only-export-components */
import {
  Children,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type NavigateOptions = {
  replace?: boolean
}

type RouterContextValue = {
  pathname: string
  navigate: (to: string, options?: NavigateOptions) => void
  params: Record<string, string>
  setParams: (params: Record<string, string>) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)
const OutletContext = createContext<ReactNode>(null)

type BrowserRouterProps = {
  children: ReactNode
}

export const BrowserRouter = ({ children }: BrowserRouterProps) => {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [params, setParams] = useState<Record<string, string>>({})

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)

    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (to === pathname) {
        return
      }

      if (options?.replace) {
        window.history.replaceState({}, '', to)
      } else {
        window.history.pushState({}, '', to)
      }

      setPathname(to)
    },
    [pathname],
  )

  const value = useMemo(
    () => ({ pathname, navigate, params, setParams }),
    [navigate, params, pathname],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

type RouteProps = {
  path?: string
  element: ReactNode
  children?: ReactNode
}

type RouteConfig = {
  path?: string
  element: ReactNode
  children: RouteConfig[]
}

const routeSymbol = Symbol('Route')

type RouteComponent = ((props: RouteProps) => null) & { routeSymbol: symbol }

export const Route = Object.assign((() => null) as unknown as RouteComponent, {
  routeSymbol,
})

const mapRoutes = (children: ReactNode): RouteConfig[] => {
  const routeElements = Children.toArray(children).filter(Boolean) as ReactElement<RouteProps>[]

  return routeElements
    .filter((child) => (child.type as RouteComponent).routeSymbol === routeSymbol)
    .map((child) => ({
      path: child.props.path,
      element: child.props.element,
      children: mapRoutes(child.props.children),
    }))
}

const pathMatches = (pattern: string | undefined, pathname: string) => {
  if (!pattern) return { matched: false, params: {} as Record<string, string> }
  if (pattern === pathname) return { matched: true, params: {} as Record<string, string> }
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return { matched: false, params: {} as Record<string, string> }
  const params: Record<string, string> = {}
  const matched = patternParts.every((part, index) => {
    if (part.startsWith(':')) { params[part.slice(1)] = decodeURIComponent(pathParts[index]); return true }
    return part === pathParts[index]
  })
  return { matched, params }
}

const matchRoute = (pathname: string, routes: RouteConfig[], onParams: (params: Record<string, string>) => void): ReactNode => {
  let fallback: RouteConfig | undefined

  for (const route of routes) {
    if (route.path === '*') {
      fallback = route
      continue
    }

    if (route.children.length > 0) {
      const matchedChild = matchRoute(pathname, route.children, onParams)
      if (matchedChild !== null) {
        return (
          <OutletContext.Provider value={matchedChild}>{route.element}</OutletContext.Provider>
        )
      }
      continue
    }

    const result = pathMatches(route.path, pathname)
    if (result.matched) {
      onParams(result.params)
      return route.element
    }
  }

  if (fallback) onParams({})
  return fallback?.element ?? null
}

type RoutesProps = {
  children: ReactNode
}

export const Routes = ({ children }: RoutesProps) => {
  const router = useRouter()
  const routes = useMemo(() => mapRoutes(children), [children])

  return <>{matchRoute(router.pathname, routes, router.setParams)}</>
}

export const Outlet = () => {
  return <>{useContext(OutletContext)}</>
}

type NavigateProps = {
  to: string
  replace?: boolean
}

export const Navigate = ({ to, replace }: NavigateProps) => {
  const router = useRouter()

  useEffect(() => {
    router.navigate(to, { replace })
  }, [replace, router, to])

  return null
}

type NavLinkClassNameArg = {
  isActive: boolean
}

type NavLinkProps = {
  children: ReactNode
  className?: string | ((args: NavLinkClassNameArg) => string)
  end?: boolean
  to: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export const Link = ({ children, className, to, onClick }: Omit<NavLinkProps, 'end'>) => {
  const router = useRouter()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onClick?.(event); router.navigate(to) }
  return <a href={to} className={typeof className === 'function' ? className({ isActive: router.pathname === to }) : className} onClick={handleClick}>{children}</a>
}

export const NavLink = ({ children, className, end, to, onClick }: NavLinkProps) => {
  const router = useRouter()
  const isActive = end ? router.pathname === to : router.pathname.startsWith(to)

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onClick?.(event)
    router.navigate(to)
  }

  return (
    <a href={to} className={resolvedClassName} onClick={handleClick}>
      {children}
    </a>
  )
}

const useRouter = () => {
  const context = useContext(RouterContext)

  if (!context) {
    throw new Error('Router components must be used inside BrowserRouter.')
  }

  return context
}

export const useLocation = () => {
  const router = useRouter()
  return { pathname: router.pathname }
}

export const useNavigate = () => {
  const router = useRouter()
  return router.navigate
}

export const useParams = () => {
  const router = useRouter()
  return router.params
}
