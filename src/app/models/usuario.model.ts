export interface Usuario {
  id: number;
  nombre: string;
  passwordappConfigurada: boolean;
  passwordpuertaConfigurada: boolean;
}

export interface UsuarioRequest {
  nombre: string;
  contrasena: string;
  passwordpuerta: string;
  passwordapp: string;
}
