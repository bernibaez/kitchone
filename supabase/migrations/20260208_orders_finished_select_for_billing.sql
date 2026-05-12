-- Allow authenticated users (e.g., cajeros) to view finished orders for billing
create policy "authenticated_can_view_finished_orders_for_billing"
on public.orders
for select
to authenticated
using (status in ('terminado', 'entregado'));
