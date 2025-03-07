curl https://tunnel.pyjam.as/3333 > tunnel.conf && wg-quick up ./tunnel.conf

# shutdown tunnel
wg-quick down ./tunnel.conf