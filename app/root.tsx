import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    ShouldReloadFunction,
    useLoaderData,
} from '@remix-run/react';
import styles from './styles/app.css';
import { Header } from './components/header/Header';
import {
    DataFunctionArgs,
    json,
    MetaFunction,
} from '@remix-run/server-runtime';
import { getCollections } from '~/providers/collections/collections';
import { activeChannel } from '~/providers/channel/channel';
import { APP_META_TITLE } from '~/constants';
import { useState } from 'react';
import { CartTray } from '~/components/cart/CartTray';
import { getActiveCustomer } from '~/providers/customer/customer';
import Footer from '~/components/footer/Footer';
import { useActiveOrder } from '~/utils/use-active-order';
import { Params } from 'react-router';
import { Submission } from '@remix-run/react/transition';

export const meta: MetaFunction = () => {
    return { title: APP_META_TITLE };
};

export function links() {
    return [
        {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap',
        },
        { rel: 'stylesheet', href: styles },
    ];
}

// The root data does not change once loaded.
export const unstable_shouldReload: ShouldReloadFunction = ({
    url,
    prevUrl,
    params,
    submission,
}) => {
    if (prevUrl.pathname === '/sign-in') {
        // just logged in
        return true;
    }
    if (prevUrl.pathname === '/account' && url.pathname === '/') {
        // just logged out
        return true;
    }
    return false;
};

export type RootLoaderData = {
    activeCustomer: Awaited<ReturnType<typeof getActiveCustomer>>;
    activeChannel: Awaited<ReturnType<typeof activeChannel>>;
    collections: Awaited<ReturnType<typeof getCollections>>;
};

export async function loader({ request }: DataFunctionArgs) {
    const collections = await getCollections(request);
    const topLevelCollections = collections.filter(
        (collection) => collection.parent?.name === '__root_collection__',
    );
    const activeCustomer = await getActiveCustomer(request);
    const loaderData: RootLoaderData = {
        activeCustomer,
        activeChannel: await activeChannel({ request }),
        collections: topLevelCollections,
    };
    return json(loaderData, { headers: activeCustomer._headers });
}

export default function App() {
    const [open, setOpen] = useState(false);
    const { collections } = useLoaderData<RootLoaderData>();
    const { activeOrderFetcher, activeOrder, adjustOrderLine, removeItem } =
        useActiveOrder();
    return (
        <html lang="en" id="app">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" type="image/png"></link>
                <Meta />
                <Links />
            </head>
            <body>
                <Header
                    onCartIconClick={() => setOpen(!open)}
                    cartQuantity={activeOrder?.totalQuantity ?? 0}
                />
                <main className="">
                    <Outlet
                        context={{
                            activeOrderFetcher,
                            activeOrder,
                            adjustOrderLine,
                            removeItem,
                        }}
                    />
                </main>
                <CartTray
                    open={open}
                    onClose={setOpen}
                    activeOrder={activeOrder}
                    adjustOrderLine={adjustOrderLine}
                    removeItem={removeItem}
                />
                <ScrollRestoration />
                <Scripts />
                {process.env.NODE_ENV === 'development' && <LiveReload />}
                <Footer collections={collections}></Footer>
            </body>
        </html>
    );
}
