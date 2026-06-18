terraform {
  required_version = ">= 1.5"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_vcn" "simples_vcn" {
  compartment_id = var.compartment_ocid
  display_name   = "simples-vcn"
  dns_label      = "simples"
  cidr_block     = "10.0.0.0/16"
}

resource "oci_core_subnet" "simples_subnet" {
  compartment_id    = var.compartment_ocid
  display_name      = "simples-subnet"
  dns_label         = "public"
  vcn_id            = oci_core_vcn.simples_vcn.id
  cidr_block        = "10.0.1.0/24"
  security_list_ids = [oci_core_security_list.simples_security_list.id]
  route_table_id    = oci_core_route_table.simples_route_table.id
  dhcp_options_id   = oci_core_vcn.simples_vcn.default_dhcp_options_id
}

resource "oci_core_internet_gateway" "simples_gateway" {
  compartment_id = var.compartment_ocid
  display_name   = "simples-internet-gateway"
  vcn_id         = oci_core_vcn.simples_vcn.id
  enabled        = true
}

resource "oci_core_route_table" "simples_route_table" {
  compartment_id = var.compartment_ocid
  display_name   = "simples-route-table"
  vcn_id         = oci_core_vcn.simples_vcn.id

  route_rules {
    network_entity_id = oci_core_internet_gateway.simples_gateway.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

resource "oci_core_security_list" "simples_security_list" {
  compartment_id = var.compartment_ocid
  display_name   = "simples-security-list"
  vcn_id         = oci_core_vcn.simples_vcn.id

  egress_security_rules {
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    protocol         = "all"
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "SSH"

    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "HTTP"

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "HTTPS"

    tcp_options {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_instance" "simples_server" {
  compartment_id      = var.compartment_ocid
  display_name        = "simples-server"
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain - 1].name
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_id   = data.oci_core_images.ubuntu.images[0].id
    source_type = "image"
    boot_volume_size_in_gbs = var.instance_disk_gb
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  freeform_tags = {
    Environment = "production"
    Project     = "simples-editor"
  }
}
