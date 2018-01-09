CREATE TABLE `categories` (
  `cid` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` bigint(20) NOT NULL COMMENT '',
  `description` varchar(128) DEFAULT NULL COMMENT '',
  `descriptionParsed` varchar(128) DEFAULT NULL COMMENT '',
  `bgColor` varchar(20) DEFAULT NULL COMMENT '',
  `color` varchar(20) DEFAULT NULL COMMENT '',
  `icon` varchar(128) DEFAULT NULL COMMENT '',
  `order` bigint(20) DEFAULT NULL COMMENT '',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='';

CREATE TABLE `topics` (
  `tid` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` bigint(20) NOT NULL COMMENT '',
  `description` varchar(128) DEFAULT NULL COMMENT '',
  `descriptionParsed` varchar(128) DEFAULT NULL COMMENT '',
  `bgColor` varchar(20) DEFAULT NULL COMMENT '',
  `color` varchar(20) DEFAULT NULL COMMENT '',
  `icon` varchar(128) DEFAULT NULL COMMENT '',
  `order` bigint(20) DEFAULT NULL COMMENT '',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='';