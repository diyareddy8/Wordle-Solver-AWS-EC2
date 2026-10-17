#!/usr/bin/env bash
# Creates the only AWS resources this project uses: a key pair, a security group and one EC2 instance.
# Run from your own machine with the AWS CLI configured.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # stop Git Bash on Windows rewriting /dev/sda1

REGION=${REGION:-ap-south-1}
NAME=wordlebot
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.micro}

AMI_ID=$(aws ec2 describe-images --owners 099720109477 --region "$REGION" \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)
VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
SUBNET_ID=$(aws ec2 describe-subnets --region "$REGION" --filters Name=default-for-az,Values=true --query 'Subnets[0].SubnetId' --output text)

# Key pair: AWS keeps the public key, the private key is saved locally
mkdir -p ~/.ssh
aws ec2 create-key-pair --region "$REGION" --key-name "$NAME-key" --query KeyMaterial --output text > ~/.ssh/$NAME-key.pem
chmod 400 ~/.ssh/$NAME-key.pem

# Security group: HTTP open to all, SSH only from this machine's public IP
SG_ID=$(aws ec2 create-security-group --region "$REGION" --group-name "$NAME-sg" \
  --description "WordleBot EC2 SG - SSH and HTTP only" --vpc-id "$VPC_ID" --query GroupId --output text)
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 22 --cidr "$MY_IP/32"
aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0

INSTANCE_ID=$(aws ec2 run-instances --region "$REGION" \
  --image-id "$AMI_ID" --instance-type "$INSTANCE_TYPE" \
  --key-name "$NAME-key" --security-group-ids "$SG_ID" --subnet-id "$SUBNET_ID" \
  --associate-public-ip-address \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=10,VolumeType=gp3,DeleteOnTermination=true}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME-app}]" \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
PUBLIC_IP=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "INSTANCE_ID=$INSTANCE_ID"
echo "SG_ID=$SG_ID"
echo "PUBLIC_IP=$PUBLIC_IP"
echo "Next: ./02-deploy.sh $PUBLIC_IP"
