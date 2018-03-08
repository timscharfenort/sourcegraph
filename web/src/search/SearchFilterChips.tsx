import escapeRegexp from 'escape-string-regexp'
import * as H from 'history'
import * as path from 'path'
import * as React from 'react'
import { matchPath } from 'react-router'
import { NavLink } from 'react-router-dom'
import { catchError } from 'rxjs/operators/catchError'
import { distinctUntilChanged } from 'rxjs/operators/distinctUntilChanged'
import { map } from 'rxjs/operators/map'
import { Subject } from 'rxjs/Subject'
import { Subscription } from 'rxjs/Subscription'
import { currentUser } from '../auth'
import { Tooltip } from '../components/tooltip/Tooltip'
import { routes } from '../routes'
import { currentConfiguration } from '../settings/configuration'
import { fetchSearchScopes } from './backend'
import { FilterChip } from './FilterChip'

interface Props {
    location: H.Location

    /**
     * The current query.
     */
    query: string

    /**
     * Called when there is a suggestion to be added to the search query.
     */
    onFilterChosen: (query: string) => void
}

interface ISearchScope {
    name?: string
    value: string
}

interface State {
    /** All search scopes from configuration */
    configuredScopes?: ISearchScope[]
    /** All fetched search scopes */
    remoteScopes?: ISearchScope[]
    user: GQL.IUser | null
}

export class SearchFilterChips extends React.PureComponent<Props, State> {
    private componentUpdates = new Subject<Props>()
    private subscriptions = new Subscription()

    constructor(props: Props) {
        super(props)

        this.state = { user: null }

        this.subscriptions.add(
            fetchSearchScopes()
                .pipe(
                    catchError(err => {
                        console.error(err)
                        return []
                    }),
                    map((remoteScopes: GQL.ISearchScope[]) => ({ remoteScopes }))
                )
                .subscribe(newState => this.setState(newState), err => console.error(err))
        )
    }

    public componentDidMount(): void {
        this.subscriptions.add(
            currentConfiguration.pipe(map(config => config['search.scopes'] || [])).subscribe(searchScopes =>
                this.setState({
                    configuredScopes: searchScopes,
                })
            )
        )
        this.subscriptions.add(currentUser.subscribe(user => this.setState({ user })))

        // Update tooltip text immediately after clicking.
        this.subscriptions.add(
            this.componentUpdates
                .pipe(distinctUntilChanged((a, b) => a.query === b.query))
                .subscribe(() => Tooltip.forceUpdate())
        )
    }

    public componentWillReceiveProps(newProps: Props): void {
        this.componentUpdates.next(newProps)
    }

    public componentWillUnmount(): void {
        this.subscriptions.unsubscribe()
    }

    public render(): JSX.Element | null {
        const scopes = this.getScopes()

        return (
            <div className="search-filter-chips">
                {/* Filtering out empty strings because old configurations have "All repositories" with empty value, which is useless with new chips design. */}
                {scopes
                    .filter(scope => scope.value !== '')
                    .map((scope, i) => (
                        <FilterChip
                            query={this.props.query}
                            onFilterChosen={this.props.onFilterChosen}
                            key={i}
                            value={scope.value}
                            name={scope.name}
                        />
                    ))}
                {this.state.user && (
                    <div className="search-filter-chips__edit">
                        <NavLink
                            className="search-filter-chips__add-edit"
                            to="/settings/configuration"
                            data-tooltip={scopes.length > 0 ? 'Edit search scopes' : undefined}
                        >
                            <small className="search-filter-chips__center">
                                {scopes.length === 0 ? (
                                    <span className="search-filter-chips__add-scopes">
                                        Add search scopes for quick filtering
                                    </span>
                                ) : (
                                    `Edit`
                                )}
                            </small>
                        </NavLink>
                    </div>
                )}
            </div>
        )
    }

    private getScopes(): ISearchScope[] {
        const allScopes: ISearchScope[] = []

        if (this.state.configuredScopes) {
            allScopes.push(...this.state.configuredScopes)
        }

        if (this.state.remoteScopes) {
            allScopes.push(...this.state.remoteScopes)
        }

        allScopes.push(...this.getScopesForCurrentRoute())
        return allScopes
    }

    /**
     * Returns contextual scopes for the current route (such as "This Repository" and
     * "This Directory").
     */
    private getScopesForCurrentRoute(): ISearchScope[] {
        const scopes: ISearchScope[] = []

        // This is basically a programmatical <Switch> with <Route>s
        // see https://reacttraining.com/react-router/web/api/matchPath
        // and https://reacttraining.com/react-router/web/example/sidebar
        for (const route of routes) {
            const match = matchPath<{ repoRev?: string; filePath?: string }>(this.props.location.pathname, route)
            if (match) {
                switch (match.path) {
                    case '/:repoRev+': {
                        // Repo page
                        const [repoPath] = match.params.repoRev!.split('@')
                        scopes.push(scopeForRepo(repoPath))
                        break
                    }
                    case '/:repoRev+/-/tree/:filePath+':
                    case '/:repoRev+/-/blob/:filePath+': {
                        // Blob/tree page
                        const isTree = match.path === '/:repoRev+/-/tree/:filePath+'

                        const [repoPath] = match.params.repoRev!.split('@')

                        scopes.push({
                            value: `repo:^${escapeRegexp(repoPath)}$`,
                        })

                        if (match.params.filePath) {
                            const dirname = isTree ? match.params.filePath : path.dirname(match.params.filePath)
                            if (dirname !== '.') {
                                scopes.push({
                                    value: `repo:^${escapeRegexp(repoPath)}$ file:^${escapeRegexp(dirname)}/`,
                                })
                            }
                        }
                        break
                    }
                }
                break
            }
        }

        return scopes
    }
}

function scopeForRepo(repoPath: string): ISearchScope {
    return {
        value: `repo:^${escapeRegexp(repoPath)}$`,
    }
}
