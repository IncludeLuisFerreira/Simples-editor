variable "compartment_ocid" {
  description = "OCID da compartment OCI"
  type        = string
}

variable "ssh_public_key" {
  description = "Chave pública SSH para acesso à instância"
  type        = string
}

variable "tenancy_ocid" {
  description = "OCID da tenancy OCI"
  type        = string
  default     = ""
}

variable "user_ocid" {
  description = "OCID do usuário OCI"
  type        = string
  default     = ""
}

variable "fingerprint" {
  description = "Fingerprint da chave de API OCI"
  type        = string
  default     = ""
}

variable "private_key_path" {
  description = "Caminho para a chave privada de API OCI"
  type        = string
  default     = ""
}

variable "region" {
  description = "Região OCI"
  type        = string
  default     = "us-ashburn-1"
}

variable "availability_domain" {
  description = "Availability domain (1-3)"
  type        = number
  default     = 1
}

variable "instance_shape" {
  description = "Shape da instância"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Número de OCPUs"
  type        = number
  default     = 2
}

variable "instance_memory_gb" {
  description = "Quantidade de memória em GB"
  type        = number
  default     = 12
}

variable "instance_disk_gb" {
  description = "Tamanho do disco boot em GB"
  type        = number
  default     = 50
}
