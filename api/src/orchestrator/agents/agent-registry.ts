import { Provider } from '@nestjs/common';
import { AGENT_REGISTRY, type AgentRegistry, type IAgent } from './agent.interface';
import { RouterAgent } from './router.agent';
import { NoopAgent } from './noop.agent';
import { ProductAgent } from './product/product.agent';
import { OrderAgent } from './order/order.agent';
import { CustomerAgent } from './customer/customer.agent';
import { NotificationAgent } from './notification/notification.agent';
import { CartAgent } from './cart/cart.agent';
import { CheckoutAgent } from './checkout/checkout.agent';

export const agentRegistryProvider: Provider = {
  provide: AGENT_REGISTRY,
  useFactory: (
    router: RouterAgent,
    noop: NoopAgent,
    product: ProductAgent,
    order: OrderAgent,
    customer: CustomerAgent,
    notification: NotificationAgent,
    cart: CartAgent,
    checkout: CheckoutAgent,
  ): AgentRegistry => {
    const registry = new Map<string, IAgent>();
    registry.set('router', router);
    registry.set('noop', noop);
    registry.set('product', product);
    registry.set('order', order);
    registry.set('customer', customer);
    registry.set('notification', notification);
    registry.set('cart', cart);
    registry.set('checkout', checkout);
    return registry;
  },
  inject: [RouterAgent, NoopAgent, ProductAgent, OrderAgent, CustomerAgent, NotificationAgent, CartAgent, CheckoutAgent],
};
