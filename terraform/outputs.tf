output "public_ip" {
  description = "IP público da instância Simples Editor"
  value       = oci_core_instance.simples_server.public_ip
}

output "instance_id" {
  description = "OCID da instância"
  value       = oci_core_instance.simples_server.id
}

output "vcn_id" {
  description = "OCID da VCN"
  value       = oci_core_vcn.simples_vcn.id
}

output "subnet_id" {
  description = "OCID da subnet"
  value       = oci_core_subnet.simples_subnet.id
}

output "availability_domain" {
  description = "Availability domain da instância"
  value       = oci_core_instance.simples_server.availability_domain
}
