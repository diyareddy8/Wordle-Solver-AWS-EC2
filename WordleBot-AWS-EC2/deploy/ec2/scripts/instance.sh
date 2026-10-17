#!/usr/bin/env bash
# Day-to-day operations. Usage: ./instance.sh <start|stop|status|update-ssh-ip> <instance-id> [sg-id]
#   start          start the instance and print its new public IP (it changes on every start)
#   stop           stop the instance: no compute charge, only EBS storage (~$0.08/month for 10 GB)
#   status         show state and public IP
#   update-ssh-ip  replace the port-22 rule with this machine's current public IP (needs sg-id)
set -euo pipefail
REGION=${REGION:-ap-south-1}
CMD=${1:?usage: $0 <start|stop|status|update-ssh-ip> <instance-id> [sg-id]}
ID=${2:?instance id required}

ip() { aws ec2 describe-instances --region "$REGION" --instance-ids "$ID" \
  --query 'Reservations[0].Instances[0].[State.Name,PublicIpAddress]' --output text; }

case "$CMD" in
  start)  aws ec2 start-instances --region "$REGION" --instance-ids "$ID" >/dev/null
          aws ec2 wait instance-running --region "$REGION" --instance-ids "$ID"; ip ;;
  stop)   aws ec2 stop-instances --region "$REGION" --instance-ids "$ID" >/dev/null
          aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$ID"; ip ;;
  status) ip ;;
  update-ssh-ip)
          SG=${3:?sg id required}
          MY_IP=$(curl -s https://checkip.amazonaws.com)
          for cidr in $(aws ec2 describe-security-groups --region "$REGION" --group-ids "$SG" \
              --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`].IpRanges[].CidrIp' --output text); do
            aws ec2 revoke-security-group-ingress --region "$REGION" --group-id "$SG" --protocol tcp --port 22 --cidr "$cidr" >/dev/null
          done
          aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG" --protocol tcp --port 22 --cidr "$MY_IP/32" >/dev/null
          echo "SSH now allowed only from $MY_IP" ;;
  *) echo "unknown command: $CMD"; exit 1 ;;
esac
