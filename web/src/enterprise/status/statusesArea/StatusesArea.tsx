import H from 'history'
import MapSearchIcon from 'mdi-react/MapSearchIcon'
import React from 'react'
import { Route, RouteComponentProps, Switch } from 'react-router'
import * as sourcegraph from 'sourcegraph'
import { ExtensionsControllerProps } from '../../../../../shared/src/extensions/controller'
import * as GQL from '../../../../../shared/src/graphql/schema'
import { PlatformContextProps } from '../../../../../shared/src/platform/context'
import { HeroPage } from '../../../components/HeroPage'
import { ChecklistIcon } from '../../../util/octicons'
import { CombinedStatusPage } from '../../checks/combinedStatus/CombinedStatusPage'
import { StatusArea } from '../../checks/detail/CheckArea'

const NotFoundPage: React.FunctionComponent = () => (
    <HeroPage icon={MapSearchIcon} title="404: Not Found" subtitle="Sorry, the requested page was not found." />
)

export interface StatusesAreaContext extends ExtensionsControllerProps, PlatformContextProps {
    /** The status scope. */
    scope: sourcegraph.StatusScope | sourcegraph.WorkspaceRoot

    /** The URL to the checks area. */
    checksURL: string

    location: H.Location
    history: H.History
    authenticatedUser: GQL.IUser | null
    isLightTheme: boolean
}

interface Props extends StatusesAreaContext, RouteComponentProps<{}> {}

/**
 * The checks area.
 */
export const StatusesArea: React.FunctionComponent<Props> = ({ match, ...props }) => {
    const context: StatusesAreaContext = {
        ...props,
        checksURL: match.url,
    }
    return (
        <Switch>
            <Route path={match.url} exact={true}>
                <div className="container">
                    <h1 className="h2 my-3 d-flex align-items-center font-weight-normal">
                        <ChecklistIcon className="icon-inline mr-3" /> Status
                    </h1>
                    <CombinedStatusPage {...context} />
                </div>
            </Route>
            <Route
                path={`${match.url}/:name`}
                // tslint:disable-next-line:jsx-no-lambda
                render={(routeComponentProps: RouteComponentProps<{ name: string }>) => (
                    <StatusArea
                        {...context}
                        name={routeComponentProps.match.params.name}
                        statusURL={routeComponentProps.match.url}
                    />
                )}
            />
            <Route key="hardcoded-key" component={NotFoundPage} />
        </Switch>
    )
}